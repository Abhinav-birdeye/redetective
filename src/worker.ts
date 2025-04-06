import { register } from 'tsx/esm/api'
import { threadId, isMainThread } from "node:worker_threads";
import { initClient } from './utils/config.js';
import { logger } from './utils/logger.js';
import { initClusterClient } from './utils/clusterConfig.js';
import { tryCatch } from './utils/try-catch.js';
export const filename = import.meta.filename;

// Register tsx enhancement
register()

export async function processBatch({ keys }: { keys: string[] }) {
    const channel = new BroadcastChannel('THREADS_CHANNEL');
    const clusterClient = await initClusterClient();
    const standaloneClient = await initClient({ connectionName: `worker-${threadId}` });
    logger.info({
        keysCount: keys.length,
        threadId,
        isMainThread,
        connectionName: "Cluster client",
    }, "Worker thread started");

    channel?.postMessage({ message: "WORKER_START", id: threadId });

    const readValuePipeline = standaloneClient.pipeline();
    for (const key of keys) {
        readValuePipeline.get(key);
    }
    const { data: valueResult, error } = await tryCatch(readValuePipeline.exec());
    if (error) {
        logger.error(error, "Error reading keys");
        return;
    }
    const valueOfKeysToMigrate = valueResult?.map((item) => item?.[1]);
    const writePromises = keys.map((key, index) => clusterClient.setex(key, 6000, valueOfKeysToMigrate?.[index] as string));
    const { error: writeError } = await tryCatch(Promise.all(writePromises));
    if (writeError) {
        logger.error(writeError, "Error writing keys");
        return;
    }
    logger.info({
        keysWritten: writePromises?.length,
        threadId,
        isMainThread,
        connectionName: "Cluster client",
    }, "Worker thread ended successfully");
    standaloneClient.quit();
    clusterClient.quit();
    channel?.postMessage({ message: "WORKER_END", id: threadId });
    return {
        keysWritten: writePromises?.length,
        threadId,
        isMainThread,
    };
}