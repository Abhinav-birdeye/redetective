import { createWriteStream } from "fs";
import { initClient } from "./config.js";
import pino from "pino";

const DAYS_IN_SECONDS = 86400;
const SCAN_BATCH_SIZE = 5000;
const SELECTED_DB = Number(process.env.REDIS_DB);
const logger = pino.pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
});
// const THIRTY_DAYS_IN_SECONDS = 1 * DAYS_IN_SECONDS;

async function main() {
	const client = await initClient();
	let cursor = 0;
	let runs = 0;
	const log1 = createWriteStream("keys-without-ttl.txt", { flags: "a" });
	const log2 = createWriteStream("keys-older-than-7-days.txt", { flags: "a" });
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
				lastAccessedDays: Math.floor(Number(item?.[1] ?? 0) / DAYS_IN_SECONDS),
				ttl,
				ttlInDays: Math.floor((ttl ?? 0) / DAYS_IN_SECONDS),
			};
		});
		const keysWithoutTTL = result?.filter((item) => item?.ttl === -1);
		const oldKeyAccessed = result?.filter(
			(item) => item?.lastAccessedDays >= 7,
		);
		const oldKeysFound = oldKeyAccessed?.length || 0;
		const noTTLKeysFound = keysWithoutTTL?.length || 0;
		log1.write(JSON.stringify(keysWithoutTTL));
		log2.write(JSON.stringify(oldKeyAccessed));
		log1.write("\n");
		log2.write("\n");
		logger.info(
			{
				cursor,
				runs,
				oldKeysFound: oldKeysFound,
				noTTLKeysFound: noTTLKeysFound,
				duration: (Date.now() - startTime) / 1000,
			},
			`Result: oldKeysFound=${
				oldKeysFound
			} noTTLKeysFound=${noTTLKeysFound} - cursor=${cursor} - run=${runs} duration - ${
				(Date.now() - startTime) / 1000
			}seconds`,
		);
	}

	do {
		await batchProcess();
		runs++;
		await new Promise((resolve) => setTimeout(resolve, 500));
	} while (cursor !== 0);
	log1.end();
	log2.end();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}
main();
