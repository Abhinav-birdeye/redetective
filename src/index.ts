import { select } from '@inquirer/prompts';
import { scan } from './scan.js';
import { migrate } from './migrate.js';

async function commandLineProgram() {
	const answer = await select({ message: 'What do you want to do?', choices: ['Scan', 'Migrate'], default: 'Scan' });
	if (answer === 'Scan') {
		await scan();
	}
	if (answer === 'Migrate') {
		await migrate();
	};
	process.exit(0);
}

commandLineProgram();