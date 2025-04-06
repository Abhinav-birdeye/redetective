import { register } from 'tsx/esm/api'
import { threadId, isMainThread } from "node:worker_threads";
import { initClient } from './utils/config.js';
import { logger } from './utils/logger.js';
export const filename = import.meta.filename;

// Register tsx enhancement
register()

export async function processBatch() {
    const standaloneClient = await initClient({ connectionName: `worker-${threadId}` });
    logger.info({ threadId, isMainThread, connectionName: standaloneClient.options.connectionName }, "Worker thread started",);
    let runs = 0;
    const scanStream = standaloneClient.scanStream({
        match: "sess:*",
        count: 100,
    });
    scanStream.on("data", async (keys) => {
        runs++;
        logger.info("Keys:", keys);
        if (runs > 2) {
            await scanStream.pause();
            await scanStream.close();
        }
    });
    await standaloneClient.ping();
    logger.info("Processing batch in worker thread");
    await standaloneClient.quit();
    return "Batch processed successfully";
}