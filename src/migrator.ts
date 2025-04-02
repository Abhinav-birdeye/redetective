import { initClusterClient } from "./clusterConfig.js";
import { initClient } from "./config.js";
import { logger } from "./logger.js";
import { tryCatch } from "./try-catch.js";

async function main() {
	const singleInstanceClient = await initClient();
	// const clusterClient = await initClusterClient();
	// const writePipeline = clusterClient.pipeline();
	let runs = 0;
	let cursor = 0;
	const readValuePipeline = singleInstanceClient.pipeline();
	const ttlPipeline = singleInstanceClient.pipeline();

	async function batchProcess() {
		const [nextCursor, keysToMigrate] = await singleInstanceClient.scan(
			cursor,
			"MATCH",
			"sess:*",
			"COUNT",
			100,
		);
		for (const key of keysToMigrate) {
			readValuePipeline.get(key);
			ttlPipeline.ttl(key);
		}
		const { data: pipelineResult, error: pipelineError } = await tryCatch(Promise.all([readValuePipeline.exec(), ttlPipeline.exec()]));
		if (pipelineError) {
			logger.error(pipelineError, "Error reading keys");
			return;
		}
		const [valueResult, ttlResult] = pipelineResult;
		const valueOfKeysToMigrate = valueResult?.map((item) => item?.[1]);
		const ttlOfKeysToMigrate = ttlResult?.map((item) => item?.[1]);
		const error = valueResult?.find((item) => item?.[0] !== null) || ttlResult?.find((item) => item?.[0] !== null);
		if (error) {
			logger.error(error, "Error reading keys");
			return;
		}
		const oldKeysWithValue = keysToMigrate.map((item, index) => ({ key: item, value: valueOfKeysToMigrate?.[index], ttl: ttlOfKeysToMigrate?.[index] }));

		logger.info({ value: oldKeysWithValue, keysFound: oldKeysWithValue?.length, cursor }, "<== KEYS TO MIGRATE ==>");
		cursor = Number(nextCursor ?? 0);
		return;
		// for (const key of oldKeysWithValue) {
		// 	writePipeline.set(key.key, key?.value as string);
		// }
		// const writeResult = await writePipeline.exec();
		// logger.info({ writeResult }, "<== WRITE RESULT ==>");
	}

	do {
		await batchProcess();
		runs++;
		await new Promise((resolve) => setTimeout(resolve, 500));
	} while (cursor !== 0 && runs < 1);

	await singleInstanceClient.quit();
	logger.info("Exiting process gracefully..");
	process.exit(0);
}

main();
