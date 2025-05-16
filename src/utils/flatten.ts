import { writeFile, readFile } from "node:fs/promises";
import { NO_TTL_KEYS_FILENAME_JSON, OLD_KEYS_FILENAME_JSON } from "./constants.js";
import { logger } from "./logger.js";

// Flatten results
export async function flattenResults() {
    logger.info("READING FILES...");
    const [noTTLData, oldKeysData] = await Promise.all([
        readFile(`${NO_TTL_KEYS_FILENAME_JSON}`, { encoding: "utf-8" }),
        readFile(`${OLD_KEYS_FILENAME_JSON}`, { encoding: "utf-8" }),
    ]);
    if (!noTTLData && !oldKeysData) {
        logger.info("NO DATA FOUND!");
        process.exit();
    }
    logger.info("PARSING FILES...");
    const formattedNoTTLData = JSON.parse(noTTLData.replace("\n", "")) as [];
    const formattedOldKeysData = JSON.parse(oldKeysData.replace("\n", "")) as [];
    logger.info("FLATTENING FILES...");
    const flattenedNoTTL = formattedNoTTLData?.flat();
    const flattenedOldKeys = formattedOldKeysData?.flat();

    await Promise.all([
        writeFile(`${NO_TTL_KEYS_FILENAME_JSON}`, JSON.stringify(flattenedNoTTL)),
        writeFile(`${OLD_KEYS_FILENAME_JSON}`, JSON.stringify(flattenedOldKeys)),
    ]);
    logger.info("FLATTENING SUCCESSFUL");
    process.exit();
}