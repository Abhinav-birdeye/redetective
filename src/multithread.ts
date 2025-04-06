import { Piscina } from "piscina";
import { filename } from "./worker.js";
import { logger } from "./utils/logger.js";
import { initClient } from "./utils/config.js";
import { tryCatch } from "./utils/try-catch.js";
import { BroadcastChannel } from "node:worker_threads";
import type { BroadcastEvent } from "./types/index.js";


const maxQueue = 4;
const workers = new Set<number>();


export async function multithread() {
    // Redis
    const standaloneClient = await initClient({ connectionName: "main-thread" });
    const scanner = standaloneClient.scanStream({
        match: "sess:*",
        count: 2,
    });

    // Worker Pool
    const channel = new BroadcastChannel("THREADS_CHANNEL");
    const pool = new Piscina({
        workerData: { fullpath: filename, customData: "Hello from main thread" },
        maxThreads: 4,
        maxQueue: 4
    });
    pool.on('drain', () => {
        if (scanner.isPaused()) {
            setTimeout(() => {
                logger.info(pool.queueSize, 'Pool resuming...');
                scanner.resume();
            }, 5000);
        }
    });

    channel.onmessage = (event: unknown) => {
        const { data: eventData } = event as BroadcastEvent;
        logger.info({ size: workers?.size, eventData }, "Worker Message Received");
        if (eventData?.message === "WORKER_START") {
            workers.add(eventData?.id);
        } else if (eventData?.message === "WORKER_END") {
            workers.delete(eventData?.id);
        }
    };

    // Wait for all workers to complete
    function waitForAllWorkers(): Promise<void> {
        if (workers.size === 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (workers.size === 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    let runs = 0;
    const workPromise = new Promise<void>((resolve, reject) => {
        scanner.on("resume", () => {
            logger.info("Scanner resumed");
        });
        scanner.on("end", () => {
            logger.info("Scanner ended");
            resolve();
        });
        scanner.on("error", (error) => {
            logger.error(error, "Scanner error");
            scanner.destroy();
            reject(error);
        });
        scanner.on("close", () => {
            logger.info("Scanner closed");
            resolve();
        })
        scanner.on("data", (keys) => {
            if (!keys?.length) {
                logger.info("Scanner empty data");
                return;
            }
            runs++;
            if (pool.queueSize === maxQueue) {
                logger.info({ queueSize: pool.queueSize, utilization: pool.utilization }, "Pool pausing max queue size reached...");
                scanner.pause();
                return;
            }
            if (runs > 10) {
                logger.info("Scanner closing limit reached...");
                scanner.close();
                resolve();
                return;
            }

            pool.run({ keys }, { name: "processBatch", filename }).then(() => {
                logger.info(`Run ${runs} completed`);
                return;
            }).catch((err) => {
                logger.error(err, "Error in worker");
                return;
            });
        });

    });

    const { error: workPromiseError } = await tryCatch(workPromise);
    if (workPromiseError) {
        logger.error(workPromiseError, "Error in work promise");
        return;
    }
    logger.info("Waiting for all workers to complete...");
    await waitForAllWorkers();
    logger.info("All workers completed, cleaning up...");
    await pool.close();
    await standaloneClient.quit();
    await scanner.destroy();
    await channel.close();
    logger.info({ runTime: pool.runTime, waitTime: pool.waitTime, duration: pool.duration, utilization: pool.utilization }, " Multithreaded completed tasks successfully");
    return;
};