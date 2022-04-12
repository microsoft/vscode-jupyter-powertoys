// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from 'path';

import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { spawnSync } from 'child_process';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download insiders
		const vscodeExecutablePath = await downloadAndUnzipVSCode('insiders');

		// Install needed extensions
		await installDependencyExtensions(vscodeExecutablePath);

		await runTests({ extensionDevelopmentPath, extensionTestsPath, vscodeExecutablePath });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

function installDependencyExtensions(vscodeExecutablePath: string) {
	// Install the Jupyter Extension
	const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    spawnSync(cliPath, ['--install-extension', 'ms-toolsai.jupyter'], {
        encoding: 'utf-8',
        stdio: 'inherit'
    });
}

main();
