import type { Cluster, Redis } from "ioredis";
import { initClusterClient } from "./clusterConfig.js";
import { initClient } from "./config.js";
import { logger } from "./logger.js";
import { tryCatch } from "./try-catch.js";

interface BatchProcessOptions {
	cursor: number;
	standAloneClient: Redis;
	clusterClient: Cluster;
	updateCursor: (value: number) => void;
}

async function batchProcess({ cursor, standAloneClient, clusterClient, updateCursor }: BatchProcessOptions) {
	// Initialize the pipelines
	// pipelines are non-blocking and a better choice compared to
	// mget and mset commands for multiple key processing
	const writePipeline = clusterClient.pipeline();
	const readValuePipeline = standAloneClient.pipeline();
	const ttlPipeline = standAloneClient.pipeline();

	// Read all the keys that match the given pattern
	const [nextCursor, keysToMigrate] = await standAloneClient.scan(
		cursor,
		"MATCH",
		"sess:*",
		"COUNT",
		100,
	);
	updateCursor(Number(nextCursor ?? 0));

	// Add the get and ttl commands to the pipelines
	for (const key of keysToMigrate) {
		readValuePipeline.get(key);
		ttlPipeline.ttl(key);
	}

	// Execute the pipeline in parallel to get the value and ttl of the keys
	const { data: pipelineResult, error: pipelineError } = await tryCatch(Promise.all([readValuePipeline.exec(), ttlPipeline.exec()]));
	if (pipelineError) {
		logger.error(pipelineError, "Error reading keys");
		return;
	}

	// Extract the values and ttls from the pipeline result
	const [valueResult, ttlResult] = pipelineResult;
	const valueOfKeysToMigrate = valueResult?.map((item) => item?.[1]);
	const ttlOfKeysToMigrate = ttlResult?.map((item) => item?.[1]);
	const error = valueResult?.find((item) => item?.[0] !== null) || ttlResult?.find((item) => item?.[0] !== null);
	if (error) {
		logger.error(error, "Error reading keys");
		return;
	}

	// Combine the keys, values and ttls into a single object and add it to the array
	const oldKeysWithValue = keysToMigrate.map((item, index) => ({ key: item, value: valueOfKeysToMigrate?.[index], ttl: ttlOfKeysToMigrate?.[index] }));

	logger.info({ value: oldKeysWithValue, keysFound: oldKeysWithValue?.length, cursor }, "<== KEYS TO MIGRATE ==>");

	// Add the setex command to the write pipeline
	for (const key of oldKeysWithValue) {
		writePipeline.setex(key.key, key?.value as string, key.ttl as number);
	}

	// Execute the write pipeline
	const writeResult = await writePipeline.exec();
	const writeError = writeResult?.find((item) => item?.[0] !== null);
	if (writeError) {
		logger.error(writeError, "Error writing keys");
		return;
	}
	logger.info({ writeResult }, "<== WRITE SUCCESS ==>");
}

async function main() {
	// Initialize the redis clients
	const standAloneClient = await initClient();
	const clusterClient = await initClusterClient();

	// Initialize the variables
	let runs = 0;
	let cursor = 0;

	// Run the batch process until the cursor is 0
	do {
		await batchProcess({ cursor, standAloneClient, clusterClient, updateCursor: (value: number) => { cursor = value; } });
		runs++;
		await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms before running the next batch
	} while (cursor !== 0 && runs < 1);

	// Quit the clients and exit the process gracefully
	clusterClient.quit();
	standAloneClient.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}

main();
