import type { Redis } from "ioredis";
import { initClient } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { tryCatch } from "./utils/try-catch.js";
import { SCAN_BATCH_SIZE } from "./utils/constants.js";
import { initLocalClient } from "./utils/localConfig.js";

interface BatchProcessOptions {
	cursor: number;
	standAloneClient: Redis;
	localClient: Redis;
	updateCursor: (value: number) => void;
	updateKeysMigrated: (value: number) => void;
}

async function batchProcess({
	cursor,
	standAloneClient,
	localClient,
	updateCursor,
	updateKeysMigrated,
}: BatchProcessOptions) {
	// Initialize the pipelines
	// pipelines are non-blocking and a better choice compared to
	// mget and mset commands for multiple key processing
	const readValuePipeline = standAloneClient.pipeline();

	// Read all the keys that match the given pattern
	const [nextCursor, keysToMigrate] = await standAloneClient.scan(
		cursor,
		"MATCH",
		"sess:*",
		"COUNT",
		SCAN_BATCH_SIZE,
	);
	updateCursor(Number(nextCursor ?? 0));

	// Add the get and ttl commands to the pipelines
	for (const key of keysToMigrate) {
		readValuePipeline.get(key);
	}

	// Execute the pipeline in parallel to get the value and ttl of the keys
	const { data: pipelineResult, error: pipelineError } = await tryCatch(
		readValuePipeline.exec(),
	);
	if (pipelineError) {
		logger.error(pipelineError, "Error reading keys");
		return;
	}
	// Extract the values and ttls from the pipeline result
	const valueResult = pipelineResult;
	const valueOfKeysToMigrate = valueResult?.map((item) => item?.[1]);
	const error = valueResult?.find((item) => item?.[0] !== null);
	if (error) {
		logger.error(error, "Error reading keys");
		return;
	}

	// Combine the keys, values and ttls into a single object and add it to the array
	const oldKeysWithValue = keysToMigrate.map((item, index) => ({
		key: item,
		value: valueOfKeysToMigrate?.[index],
	}));

	// Add the setex command to the write promises
	// note: pipelining does not work for clusters (need to specify specific node)
	const writePromises = oldKeysWithValue.map((key) =>
		localClient.setex(key.key, 60 * 60 * 24, key?.value as string),
	);
	const { error: writeError } = await tryCatch(Promise.all(writePromises));
	if (writeError) {
		logger.error(writeError, "Error writing keys");
		return;
	}
	updateKeysMigrated(oldKeysWithValue?.length);
	return;
}

export async function migrateToLocal() {
	// Initialize the redis clients
	const standAloneClient = await initClient();
	const localClient = await initLocalClient();
	const startTime = Date.now();

	// Initialize the variables
	let runs = 0;
	let cursor = 0;
	let keysMigrated = 0;

	// Run the batch process until the cursor is 0
	do {
		await batchProcess({
			cursor,
			standAloneClient,
			localClient,
			updateCursor: (value: number) => {
				cursor = value;
			},
			updateKeysMigrated: (value: number) => {
				keysMigrated += value;
			},
		});
		runs++;
		logger.info(
			`batchProcess: Run ${runs} completed, ${keysMigrated} keys migrated`,
		);
		await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms before running the next batch
	} while (cursor !== 0);
	if (keysMigrated === 0) {
		logger.warn("No keys found to migrate");
	} else {
		logger.info(
			`Sucess: Total ${keysMigrated} keys migrated successfully in ${(Date.now() - startTime) / 1000} seconds`,
		);
	}
	// Quit the clients and exit the process gracefully
	localClient.quit();
	standAloneClient.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}
