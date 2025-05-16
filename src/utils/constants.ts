// CONSTANTS

import env from "@/utils/env.js";

export const DAYS_IN_SECONDS = 86400;
export const SCAN_BATCH_SIZE = 5000;
export const BATCH_PROCES_DELAY = 1 * 1000; //seconds
export const DELETE_KEY_PATTERN = "yourpatternhere:*";
export const MIGRATE_KEY_PATTERN = "yourpatternhere:*";
export const SELECTED_DB = env.client.db;
export const DAYS_THRESHOLD = 14;
export const DIRECTORY = `result/db${SELECTED_DB}/`;
export const OLD_KEYS_FILENAME_TXT = `${DIRECTORY}${SELECTED_DB}-keys-older-${DAYS_THRESHOLD}-days.txt`;
export const NO_TTL_KEYS_FILENAME_TXT = `${DIRECTORY}${SELECTED_DB}-keys-no-ttl.txt`;
export const KEY_SIZE_FILENAME_TXT = `${DIRECTORY}${SELECTED_DB}-size.txt`;
export const OLD_KEYS_FILENAME_JSON = `${DIRECTORY}${SELECTED_DB}-keys-older-${DAYS_THRESHOLD}-days.json`;
export const NO_TTL_KEYS_FILENAME_JSON = `${DIRECTORY}${SELECTED_DB}-keys-no-ttl.json`;

export const CONSTANTS = {
	DAYS_IN_SECONDS,
	SCAN_BATCH_SIZE,
	SELECTED_DB,
	DAYS_THRESHOLD,
	DIRECTORY,
	OLD_KEYS_FILENAME_TXT,
	NO_TTL_KEYS_FILENAME_TXT,
	OLD_KEYS_FILENAME_JSON,
	NO_TTL_KEYS_FILENAME_JSON,
};

export const CLI_ACTIONS = {
	SCAN: "SCAN",
	SCAN_SIZE: "SCAN_SIZE",
	FLATTEN: "FLATTEN",
	MIGRATE: "MIGRATE",
	MIGRATE_STANDALONE: "MIGRATE_STANDALONE",
	DELETE_STANDLONE: "DELETE_STANDLONE",
	DELETE_CLUSTER: "DELETE_CLUSTER",
} as const;

export type CLI_ACTION = (typeof CLI_ACTIONS)[keyof typeof CLI_ACTIONS];

export const CLI_OPTIONS = [
	{
		value: CLI_ACTIONS.SCAN,
		name: "🕵  Scan standalone db",
		description: "Scan and analyse keys",
	},
	{
		value: CLI_ACTIONS.SCAN_SIZE,
		name: "🕵  Scan size of keys in standalone db",
		description: "Scan and calculate total size occupied by keys",
	},
	{
		value: CLI_ACTIONS.FLATTEN,
		name: "🕵  Flatten scan results",
		description: "Flatten scan results",
	},
	{
		value: CLI_ACTIONS.MIGRATE,
		name: "➡️  Migrate from standalone to cluster",
		description: "Migrate keys to cluster",
	},
	{
		value: CLI_ACTIONS.DELETE_STANDLONE,
		name: "🗑  Delete keys from standalone",
		description: "Delete keys from standalone instance",
	},
	{
		value: CLI_ACTIONS.DELETE_CLUSTER,
		name: "🗑  Delete keys from cluster",
		description: "Delete keys from cluster",
	},
	{
		value: CLI_ACTIONS.MIGRATE_STANDALONE,
		name: "➡️  Migrate from remote standalone to local standalone",
		description:
			"Migrate keys from remote instance to local standalone instance",
	},
];
