import { Piscina } from "piscina";
import { resolve } from "node:path";
import { filename } from "./worker.js";
import { logger } from "./utils/logger.js";


const pool = new Piscina({
    workerData: { fullpath: filename, customData: "Hello from main thread" },
});


export async function multithread() {
    logger.info("RUNNING MULTITHREAD");
    const [result1, result2] = await Promise.all([
        pool.run("", { name: "processBatch", filename: resolve(import.meta.dirname, "./worker.ts") }),
        pool.run("", { name: "processBatch", filename: resolve(import.meta.dirname, "./worker.ts") }),
    ]);
    logger.info("Result 1:", result1);
    logger.info("Result 2:", result2);
};