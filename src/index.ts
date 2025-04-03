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
	const answer = await select({
		message: 'What do you want to do?',
		choices: [
			{ value: "Scan", name: "Scan", description: "Scan and analyse keys" },
			{ value: "Migrate", name: "Migrate", description: "Migrate session keys to cluster" }],
		default: 'Scan'
	});
	if (answer === 'Scan') {
		await scan();
		process.exit(0);
	}
	else if (answer === 'Migrate') {
		await migrate();
		process.exit(0);
	}
	else {
		console.log('Invalid choice');
		process.exit(0);
	}
}

commandLineProgram();