import { select } from "@inquirer/prompts";
import { scan } from "@/scan.js";
import { migrate } from "@/migrate.js";
import { deleteKeys } from "@/delete.js";
import { CLI_ACTIONS, CLI_OPTIONS } from "@/utils/constants.js";
import { deleteClusterKeys } from "@/delete-cluster.js";
import { flattenResults } from "@/utils/flatten.js";
import { migrateToLocal } from "@/migrate-to-local.js";
import { scanSize } from "@/scan-size.js";

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
		choices: CLI_OPTIONS,
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
