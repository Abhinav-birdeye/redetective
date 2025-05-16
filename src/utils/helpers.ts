import { existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import {
	DAYS_IN_SECONDS,
	NO_TTL_KEYS_FILENAME_JSON,
	NO_TTL_KEYS_FILENAME_TXT,
	OLD_KEYS_FILENAME_JSON,
	OLD_KEYS_FILENAME_TXT,
} from "@/utils/constants.js";

/**
 * Ensures that a directory exists, creating it if necessary
 * @param {string} filePath - The path of the directory to check/create
 * @returns {void}
 */
export function ensureDirectoryExistence(filePath: string) {
	if (!existsSync(filePath)) {
		mkdirSync(filePath, { recursive: true });
	}
}

/**
 * Converts seconds to days
 * @param {number} seconds - The number of seconds to convert
 * @returns {number} The equivalent number of days
 */
export function convertSecondsToDays(seconds: number) {
	return Math.floor(seconds / DAYS_IN_SECONDS);
}

/**
 * Converts TXT files to JSON format and cleans up the original files
 * @async
 * @function formatOutputToJson
 * @description
 * Reads TXT files containing Redis keys, converts them to JSON format,
 * and deletes the original TXT files
 * @returns {Promise<void>}
 */
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

/**
 * Calculates the size of a string in bytes
 * @param {string} str - The string to measure
 * @returns {number} The size of the string in bytes
 */
export const byteSize = (str: string) => new Blob([str])?.size;

/**
 * Converts bytes to megabytes
 * @param {number} bytes - The number of bytes to convert
 * @returns {number} The equivalent size in megabytes
 */
export function bytesToMB(bytes: number) {
	return bytes / (1024 * 1024);
}

/**
 * Pauses execution for a specified number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>}
 */
export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
