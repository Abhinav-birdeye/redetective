import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { initClient } from "./config.js";
import pino from "pino";

// CONSTANTS

const DAYS_IN_SECONDS = 86400;
const SCAN_BATCH_SIZE = 3000;
const SELECTED_DB = Number(process.env.REDIS_DB);
const DAYS_THRESHOLD = 14;
const DIRECTORY = `result/db${SELECTED_DB}/`;
const OLD_KEYS_FILENAME_TXT = `${DIRECTORY}${SELECTED_DB}-keys-older-${DAYS_THRESHOLD}-days.txt`;
const NO_TTL_KEYS_FILENAME_TXT = `${DIRECTORY}${SELECTED_DB}-keys-no-ttl.txt`;
const OLD_KEYS_FILENAME_JSON = `${DIRECTORY}${SELECTED_DB}-keys-older-${DAYS_THRESHOLD}-days.json`;
const NO_TTL_KEYS_FILENAME_JSON = `${DIRECTORY}${SELECTED_DB}-keys-no-ttl.json`;

const logger = pino.pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
});

// HELPER FUNCTIONS

// function ensureDirectoryExistence(filePath: string) {
// 	if (!existsSync(filePath)) {
// 		mkdirSync(filePath, { recursive: true });
// 	}
// }

// ensureDirectoryExistence(DIRECTORY);

// function convertSecondsToDays(seconds: number) {
// 	return Math.floor(seconds / DAYS_IN_SECONDS);
// }

// async function formatOutputToJson() {
// 	const [noTTLData, oldKeysData] = await Promise.all([
// 		readFile(`${NO_TTL_KEYS_FILENAME_TXT}`, { encoding: "utf-8" }),
// 		readFile(`${OLD_KEYS_FILENAME_TXT}`, { encoding: "utf-8" }),
// 	]);
// 	const formattedNoTTLData = noTTLData.split("\n").join().slice(0, -1);
// 	const formattedOldKeysData = oldKeysData.split("\n").join().slice(0, -1);
// 	await Promise.all([
// 		writeFile(`${NO_TTL_KEYS_FILENAME_JSON}`, formattedNoTTLData),
// 		writeFile(`${OLD_KEYS_FILENAME_JSON}`, formattedOldKeysData),
// 	]);
// 	await Promise.all([
// 		unlink(`${NO_TTL_KEYS_FILENAME_TXT}`),
// 		unlink(`${OLD_KEYS_FILENAME_TXT}`),
// 	]);
// }

// MAIN PROGRAM

// async function main() {
// 	const client = await initClient();
// 	let cursor = 0;
// 	let runs = 0;
// 	const log1 = createWriteStream(`${NO_TTL_KEYS_FILENAME_TXT}`, {
// 		flags: "a",
// 	});
// 	const log2 = createWriteStream(`${OLD_KEYS_FILENAME_TXT}`, { flags: "a" });
// 	async function batchProcess() {
// 		const startTime = Date.now();
// 		const scanResult = await client.scan(cursor, "COUNT", SCAN_BATCH_SIZE);
// 		const serverCursor = Number(scanResult?.[0] ?? 0);
// 		cursor = serverCursor;
// 		const keys = scanResult[1];
// 		const commands: string[][] = [];
// 		const ttlCommands: string[][] = [];

// 		for (const key of keys) {
// 			commands.push(["object", "idletime", key]);
// 			ttlCommands.push(["ttl", key]);
// 		}
// 		// const response = await client.pipeline(commands).exec();
// 		const [idleTimeResponse, ttlResponse] = await Promise.all([
// 			client.pipeline(commands).exec(),
// 			client.pipeline(ttlCommands).exec(),
// 		]);

// 		const result = idleTimeResponse?.map((item, index) => {
// 			const ttl = Number(ttlResponse?.[index]?.[1]);
// 			return {
// 				db: SELECTED_DB,
// 				key: commands?.[index]?.[2],
// 				lastAccessedSeconds: Math.floor(Number(item?.[1] ?? 0) ?? null),
// 				lastAccessedDays: convertSecondsToDays(Number(item?.[1] ?? 0)),
// 				ttl,
// 				ttlInDays: convertSecondsToDays(ttl ?? 0),
// 			};
// 		});
// 		const keysWithoutTTL = result?.filter((item) => item?.ttl === -1);
// 		const oldKeyAccessed = result?.filter(
// 			(item) => item?.lastAccessedDays >= 7,
// 		);
// 		const oldKeysFound = oldKeyAccessed?.length || 0;
// 		const noTTLKeysFound = keysWithoutTTL?.length || 0;
// 		if (noTTLKeysFound > 0) {
// 			log1.write(`${JSON.stringify(keysWithoutTTL)}\n`);
// 		}
// 		if (oldKeysFound > 0) {
// 			log2.write(`${JSON.stringify(oldKeyAccessed)}\n`);
// 		}
// 		logger.info(
// 			{
// 				cursor,
// 				runs,
// 				duration: (Date.now() - startTime) / 1000,
// 			},
// 			"Result:",
// 		);
// 	}

// 	do {
// 		await batchProcess();
// 		runs++;
// 		await new Promise((resolve) => setTimeout(resolve, 500));
// 	} while (cursor !== 0);
// 	log1.end();
// 	log2.end();
// 	// read the file and join the array in new line
// 	try {
// 		await formatOutputToJson();
// 	} catch (error) {
// 		logger.error(error, "Error formatting output txt to json");
// 	}
// 	await client.quit();
// 	logger.info("Exiting process gracefully..");
// 	process.exit(0);
// }

async function main() {
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
	const formattedNoTTLData = JSON.parse(noTTLData) as [];
	const formattedOldKeysData = JSON.parse(oldKeysData) as [];
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
main();

// Write a function to identify string patterns in an array of strings, every string is unique inside the array.
