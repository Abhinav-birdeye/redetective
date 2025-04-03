import type { Cluster, Redis } from "ioredis";
import { initClient } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { tryCatch } from "./utils/try-catch.js";
import { initClusterClient } from "./utils/clusterConfig.js";
import { SCAN_BATCH_SIZE } from "./utils/constants.js";

interface BatchProcessOptions {
    cursor: number;
    clusterClient: Cluster;
    updateCursor: (value: number) => void;
}

async function batchProcess({ cursor, clusterClient, updateCursor }: BatchProcessOptions) {
    // Initialize the pipelines
    // pipelines are non-blocking and a better choice compared to
    // mget and mset commands for multiple key processing

    // Read all the keys that match the given pattern
    const [nextCursor, keysToDelete] = await clusterClient.scan(
        cursor,
        "MATCH",
        "sess:*",
        "COUNT",
        SCAN_BATCH_SIZE,
    );
    updateCursor(Number(nextCursor ?? 0));

    if (!keysToDelete?.length) {
        return;
    }

    // Add the delete commands to the pipeline
    const deletePromises = keysToDelete?.map((key) => clusterClient.del(key));

    // Execute the pipeline
    const { error: pipelineError } = await tryCatch(Promise.all(deletePromises));
    if (pipelineError) {
        logger.error(pipelineError, "Error in pipeline deleting keys");
        return;
    }

    // Extract the values and ttls from the pipeline result
    logger.info(`<== ${keysToDelete?.length} keys deleted successfully  ==>`);
}

export async function deleteClusterKeys() {
    // Initialize the redis clients
    const clusterClient = await initClusterClient();

    // Initialize the variables
    let runs = 0;
    let cursor = 0;

    // Run the batch process until the cursor is 0
    do {
        await batchProcess({ cursor, clusterClient, updateCursor: (value: number) => { cursor = value; } });
        runs++;
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms before running the next batch
    } while (cursor !== 0 && runs < 1);

    // Quit the clients and exit the process gracefully
    clusterClient.quit();
    logger.info("Exiting process gracefully..");
    process.exit(0);
}