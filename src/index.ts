import { select } from '@inquirer/prompts';
import { scan } from './scan.js';
import { migrate } from './migrate.js';
import { deleteKeys } from './delete.js';

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
			{ value: "Scan", name: "Scan", description: "Scan and analyse keys" },
			{ value: "Migrate", name: "Migrate", description: "Migrate session keys to cluster" },
			{ value: "Delete", name: "Delete", description: "Delete session keys from standalone instance" }
		],
		default: 'Scan'
	});
	if (answer === 'Scan') {
		await scan();
	}
	else if (answer === 'Migrate') {
		await migrate();
	}
	else if (answer === 'Delete') {
		await deleteKeys();
	}
	else {
		console.log('Invalid choice');
		process.exit(0);
	}
	process.exit(0);
}

commandLineProgram();