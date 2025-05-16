import { createWriteStream } from "node:fs";
import { initClient } from "./utils/config.js";
import {
	DIRECTORY,
	KEY_SIZE_FILENAME_TXT,
	SCAN_BATCH_SIZE,
} from "./utils/constants.js";
import { logger } from "./utils/logger.js";
import {
	byteSize,
	bytesToMB,
	ensureDirectoryExistence,
} from "./utils/helpers.js";

ensureDirectoryExistence(DIRECTORY);

export async function scanSize() {
	const client = await initClient();
	let cursor = 0;
	let runs = 0;
	const log1 = createWriteStream(`${KEY_SIZE_FILENAME_TXT}`, {
		flags: "a",
	});
	let totalSize = 0;
	async function batchProcess() {
		const startTime = Date.now();
		const scanResult = await client.scan(cursor, "COUNT", SCAN_BATCH_SIZE);
		const serverCursor = Number(scanResult?.[0] ?? 0);
		cursor = serverCursor;
		const keys = scanResult[1];
		const commands: string[][] = [];

		for (const key of keys) {
			commands.push(["get", key]);
		}
		const [getKeyResponse] = await Promise.all([
			client.pipeline(commands).exec(),
		]);

		const result = getKeyResponse?.reduce(
			(accumulator, currentValue) =>
				accumulator + byteSize(currentValue?.[1] as string),
			0,
		);
		log1.write(`${JSON.stringify(result)}\n`);
		logger.info(
			{
				cursor,
				runs,
				duration: (Date.now() - startTime) / 1000,
			},
			"Result:",
		);
		return result ?? 0;
	}

	do {
		let currentSize = 0;
		currentSize = (await batchProcess()) ?? 0;
		totalSize = totalSize + currentSize;
		runs++;
		await new Promise((resolve) => setTimeout(resolve, 500));
	} while (cursor !== 0);
	const totalSizeInMB = bytesToMB(totalSize);
	logger.info({ totalSize: totalSizeInMB }, "Total size of keys in MB");
	log1.write(`TOTAL SIZE=${totalSizeInMB} MB\n`);
	log1.end();
	await client.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}
