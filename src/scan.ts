import { createWriteStream } from "node:fs";
import { initClient } from "@/utils/config.js";
import {
	DIRECTORY,
	NO_TTL_KEYS_FILENAME_TXT,
	OLD_KEYS_FILENAME_TXT,
	SCAN_BATCH_SIZE,
	SELECTED_DB,
} from "@/utils/constants.js";
import { logger } from "@/utils/logger.js";
import {
	convertSecondsToDays,
	ensureDirectoryExistence,
	formatOutputToJson,
	sleep,
} from "@/utils/helpers.js";

ensureDirectoryExistence(DIRECTORY);

export async function scan() {
	const client = await initClient();
	const log1 = createWriteStream(`${NO_TTL_KEYS_FILENAME_TXT}`, {
		flags: "a",
	});
	const log2 = createWriteStream(`${OLD_KEYS_FILENAME_TXT}`, { flags: "a" });

	let cursor = 0;
	let runs = 0;

	async function batchProcess() {
		const startTime = Date.now();
		const scanResult = await client.scan(cursor, "COUNT", SCAN_BATCH_SIZE);
		const serverCursor = Number(scanResult?.[0] ?? 0);
		cursor = serverCursor;
		const keys = scanResult[1];
		const commands: string[][] = [];
		const ttlCommands: string[][] = [];

		for (const key of keys) {
			commands.push(["object", "idletime", key]);
			ttlCommands.push(["ttl", key]);
		}
		// const response = await client.pipeline(commands).exec();
		const [idleTimeResponse, ttlResponse] = await Promise.all([
			client.pipeline(commands).exec(),
			client.pipeline(ttlCommands).exec(),
		]);

		const result = idleTimeResponse?.map((item, index) => {
			const ttl = Number(ttlResponse?.[index]?.[1]);
			return {
				db: SELECTED_DB,
				key: commands?.[index]?.[2],
				lastAccessedSeconds: Math.floor(Number(item?.[1] ?? 0) ?? null),
				lastAccessedDays: convertSecondsToDays(Number(item?.[1] ?? 0)),
				ttl,
				ttlInDays: convertSecondsToDays(ttl ?? 0),
			};
		});
		const keysWithoutTTL = result?.filter((item) => item?.ttl === -1);
		const oldKeyAccessed = result?.filter(
			(item) => item?.lastAccessedDays >= 7,
		);
		const oldKeysFound = oldKeyAccessed?.length || 0;
		const noTTLKeysFound = keysWithoutTTL?.length || 0;
		if (noTTLKeysFound > 0) {
			log1.write(`${JSON.stringify(keysWithoutTTL)}\n`);
		}
		if (oldKeysFound > 0) {
			log2.write(`${JSON.stringify(oldKeyAccessed)}\n`);
		}
		logger.info(
			{
				cursor,
				runs,
				duration: (Date.now() - startTime) / 1000,
			},
			"Result:",
		);
	}

	do {
		await batchProcess();
		runs++;
		await sleep(500);
	} while (cursor !== 0);
	log1.end();
	log2.end();
	// read the file and join the array in new line
	try {
		await formatOutputToJson();
	} catch (error) {
		logger.error(error, "Error formatting output txt to json");
	}
	await client.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}
