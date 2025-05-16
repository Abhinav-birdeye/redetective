import type { Cluster, Redis } from "ioredis";
import { initClusterClient } from "./utils/clusterConfig.js";
import { initClient } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { tryCatch } from "./utils/try-catch.js";
import { SCAN_BATCH_SIZE } from "./utils/constants.js";

interface BatchProcessOptions {
	cursor: number;
	standAloneClient: Redis;
	clusterClient: Cluster;
	updateCursor: (value: number) => void;
	updateKeysMigrated: (value: number) => void;
}

async function batchProcess({
	cursor,
	standAloneClient,
	clusterClient,
	updateCursor,
	updateKeysMigrated,
}: BatchProcessOptions) {
	// Initialize the pipelines
	// pipelines are non-blocking and a better choice compared to
	// mget and mset commands for multiple key processing
	const readValuePipeline = standAloneClient.pipeline();
	const ttlPipeline = standAloneClient.pipeline();

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
		ttlPipeline.ttl(key);
	}

	// Execute the pipeline in parallel to get the value and ttl of the keys
	const { data: pipelineResult, error: pipelineError } = await tryCatch(
		Promise.all([readValuePipeline.exec(), ttlPipeline.exec()]),
	);
	if (pipelineError) {
		logger.error(pipelineError, "Error reading keys");
		return;
	}

	// Extract the values and ttls from the pipeline result
	const [valueResult, ttlResult] = pipelineResult;
	const valueOfKeysToMigrate = valueResult?.map((item) => item?.[1]);
	const ttlOfKeysToMigrate = ttlResult?.map((item) => item?.[1]);
	const error =
		valueResult?.find((item) => item?.[0] !== null) ||
		ttlResult?.find((item) => item?.[0] !== null);
	if (error) {
		logger.error(error, "Error reading keys");
		return;
	}

	// Combine the keys, values and ttls into a single object and add it to the array
	const oldKeysWithValue = keysToMigrate.map((item, index) => ({
		key: item,
		value: valueOfKeysToMigrate?.[index],
		ttl: ttlOfKeysToMigrate?.[index],
	}));

	// Add the setex command to the write promises
	// note: pipelining does not work for clusters (need to specify specific node)
	const writePromises = oldKeysWithValue.map((key) =>
		clusterClient.setex(key.key, Number(key.ttl), key?.value as string),
	);
	const { error: writeError } = await tryCatch(Promise.all(writePromises));
	if (writeError) {
		logger.error(writeError, "Error writing keys");
		return;
	}
	updateKeysMigrated(oldKeysWithValue?.length);
	return;
}

export async function migrate() {
	// Initialize the redis clients
	const standAloneClient = await initClient();
	const clusterClient = await initClusterClient();
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
			clusterClient,
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
	clusterClient.quit();
	standAloneClient.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}
