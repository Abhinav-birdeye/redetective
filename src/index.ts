import { select } from '@inquirer/prompts';
import { scan } from './scan.js';
import { migrate } from './migrate.js';
import { deleteKeys } from './delete.js';
import { CLI_ACTIONS } from './utils/constants.js';
import { deleteClusterKeys } from './delete-cluster.js';

process.on('uncaughtException', (error) => {
	if (error instanceof Error && error.name === 'ExitPromptError') {
		console.log('👋 until next time!');
	} else {
		// Rethrow unknown errors
		throw error;
	}
});



async function commandLineProgram() {
	const answer = await select({
		message: 'What do you want to do?',
		choices: [
			{ value: CLI_ACTIONS.SCAN, name: "🕵  Scan standalone db", description: "Scan and analyse keys" },
			{ value: CLI_ACTIONS.MIGRATE, name: "➡️  Migrate from standalone to cluster", description: "Migrate session keys to cluster" },
			{ value: CLI_ACTIONS.DELETE_STANDLONE, name: "🗑  Delete keys from standalone", description: "Delete session keys from standalone instance" },
			{ value: CLI_ACTIONS.DELETE_CLUSTER, name: "🗑  Delete keys from cluster", description: "Delete session keys from cluster" }
		],
		default: CLI_ACTIONS.SCAN,
	});
	switch (answer) {
		case "SCAN":
			await scan();
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
		default:
			console.log('Invalid choice');
			break;
	}
	process.exit(0);
}

commandLineProgram();