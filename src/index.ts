import { select } from "@inquirer/prompts";
import { scan } from "./scan.js";
import { migrate } from "./migrate.js";
import { deleteKeys } from "./delete.js";
import { CLI_ACTIONS } from "./utils/constants.js";
import { deleteClusterKeys } from "./delete-cluster.js";
import { flattenResults } from "./utils/flatten.js";
import { migrateToLocal } from "./migrate-to-local.js";
import { scanSize } from "./scan-size.js";

process.on("uncaughtException", (error) => {
	if (error instanceof Error && error.name === "ExitPromptError") {
		console.log("👋 until next time!");
	} else {
		// Rethrow unknown errors
		throw error;
	}
});

async function commandLineProgram() {
	const answer = await select({
		message: "What do you want to do?",
		choices: [
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
		],
		default: CLI_ACTIONS.SCAN,
	});
	switch (answer) {
		case "SCAN":
			await scan();
			break;
		case "SCAN_SIZE":
			await scanSize();
			break;
		case "MIGRATE":
			await migrate();
			break;
		case "DELETE_STANDLONE":
			await deleteKeys();
			break;
		case "DELETE_CLUSTER":
			await deleteClusterKeys();
			break;
		case "FLATTEN":
			await flattenResults();
			break;
		case "MIGRATE_STANDALONE":
			await migrateToLocal();
			break;
		default:
			console.log("Invalid choice");
			break;
	}
	process.exit(0);
}

commandLineProgram();
