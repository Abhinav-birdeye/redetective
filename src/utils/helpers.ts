import { existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { DAYS_IN_SECONDS, NO_TTL_KEYS_FILENAME_JSON, NO_TTL_KEYS_FILENAME_TXT, OLD_KEYS_FILENAME_JSON, OLD_KEYS_FILENAME_TXT } from "./constants.js";


export function ensureDirectoryExistence(filePath: string) {
    if (!existsSync(filePath)) {
        mkdirSync(filePath, { recursive: true });
    }
}

export function convertSecondsToDays(seconds: number) {
    return Math.floor(seconds / DAYS_IN_SECONDS);
}

export async function formatOutputToJson() {
    const [noTTLData, oldKeysData] = await Promise.all([
        readFile(`${NO_TTL_KEYS_FILENAME_TXT}`, { encoding: "utf-8" }),
        readFile(`${OLD_KEYS_FILENAME_TXT}`, { encoding: "utf-8" }),
    ]);
    const formattedNoTTLData = noTTLData.split("\n").join().slice(0, -1);
    const formattedOldKeysData = oldKeysData.split("\n").join().slice(0, -1);
    await Promise.all([
        writeFile(`${NO_TTL_KEYS_FILENAME_JSON}`, formattedNoTTLData),
        writeFile(`${OLD_KEYS_FILENAME_JSON}`, formattedOldKeysData),
    ]);
    await Promise.all([
        unlink(`${NO_TTL_KEYS_FILENAME_TXT}`),
        unlink(`${OLD_KEYS_FILENAME_TXT}`),
    ]);
}