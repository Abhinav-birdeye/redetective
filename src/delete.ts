import type { Redis } from "ioredis";
import { initClient } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { tryCatch } from "./utils/try-catch.js";

interface BatchProcessOptions {
    cursor: number;
    standAloneClient: Redis;
    updateCursor: (value: number) => void;
}

async function batchProcess({ cursor, standAloneClient, updateCursor }: BatchProcessOptions) {
    // Initialize the pipelines
    // pipelines are non-blocking and a better choice compared to
    // mget and mset commands for multiple key processing
    const deletePipeline = standAloneClient.pipeline();
    // Read all the keys that match the given pattern
    const [nextCursor, keysToDelete] = await standAloneClient.scan(
        cursor,
        "MATCH",
        "sess:*",
        "COUNT",
        100,
    );
    updateCursor(Number(nextCursor ?? 0));

    // Add the delete commands to the pipeline
    for (const key of keysToDelete) {
        deletePipeline.del(key);
    }

    // Execute the pipeline
    const { data: pipelineResult, error: pipelineError } = await tryCatch(deletePipeline.exec());
    if (pipelineError) {
        logger.error(pipelineError, "Error in pipeline deleting keys");
        return;
    }

    // Extract the values and ttls from the pipeline result

    const error = pipelineResult?.find((item) => item?.[0] !== null);
    if (error) {
        logger.error(error, "Error deleting keys");
        return;
    }
    logger.info(`<== ${keysToDelete.length} keys deleted successfully  ==>`);
}

export async function deleteKeys() {
    // Initialize the redis clients
    const standAloneClient = await initClient();

    // Initialize the variables
    let runs = 0;
    let cursor = 0;

    // Run the batch process until the cursor is 0
    do {
        await batchProcess({ cursor, standAloneClient, updateCursor: (value: number) => { cursor = value; } });
        runs++;
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms before running the next batch
    } while (cursor !== 0 && runs < 1);

    // Quit the clients and exit the process gracefully
    standAloneClient.quit();
    logger.info("Exiting process gracefully..");
    process.exit(0);
}