import { initClusterClient } from "./clusterConfig.js";
import { initClient } from "./config.js";
import { logger } from "./logger.js";

async function main() {
	const singleInstanceClient = await initClient();
	let runs = 0;
	let cursor = 0;
	const readPipeline = singleInstanceClient.pipeline();

	async function batchProcess() {
		const clusterClient = await initClusterClient();
		const writePipeline = clusterClient.pipeline();
		const [nextCursor, keysToMigrate] = await singleInstanceClient.scan(
			cursor,
			"MATCH",
			"sess:*",
			"COUNT",
			100,
		);
		for (const key of keysToMigrate) {
			readPipeline.get(key);
		}
		const result = await readPipeline.exec();
		const valueOfKeysToMigrate = result?.map((item) => item?.[1]);
		const error = result?.find((item) => item?.[0] !== null);
		if (error) {
			logger.error(error, "Error reading keys");
			return;
		}
		const oldKeysWithValue = keysToMigrate.map((item, index) => ({ key: item, value: valueOfKeysToMigrate?.[index] }));

		logger.info({ keysFound: oldKeysWithValue?.length, cursor }, "<== KEYS TO MIGRATE ==>");
		cursor = Number(nextCursor ?? 0);
		for (const key of oldKeysWithValue) {
			writePipeline.set(key.key, key?.value as string);
		}
		const writeResult = await writePipeline.exec();
		logger.info({ writeResult }, "<== WRITE RESULT ==>");
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
