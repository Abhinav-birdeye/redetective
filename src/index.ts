import { select } from '@inquirer/prompts';
import { scan } from './scan.js';
import { migrate } from './migrate.js';

process.on('uncaughtException', (error) => {
	if (error instanceof Error && error.name === 'ExitPromptError') {
		console.log('👋 until next time!');
	} else {
		// Rethrow unknown errors
		throw error;
	}
});

async function commandLineProgram() {
	const answer = await select({ message: 'What do you want to do?', choices: [{ value: "Scan", name: "Scan and analyse keys" }, { value: "Migrate", name: "Migrate session keys to cluster" }], default: 'Scan' });
	if (answer === 'Scan') {
		await scan();
	}
	if (answer === 'Migrate') {
		await migrate();
	};
	process.exit(0);
}

commandLineProgram();