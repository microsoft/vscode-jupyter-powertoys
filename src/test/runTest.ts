// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from 'path';

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { spawnSync } from 'child_process';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download insiders
		const vscodeExecutablePath = await downloadAndUnzipVSCode('insiders');

		// Install needed extensions
		installDependencyExtensions(vscodeExecutablePath);

		await runTests({ extensionDevelopmentPath, extensionTestsPath, vscodeExecutablePath });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

function installDependencyExtensions(vscodeExecutablePath: string) {
	// Install the Jupyter Extension into the test extensions directory
	const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const result = spawnSync(cli, [...args, '--install-extension', 'ms-toolsai.jupyter'], {
        encoding: 'utf-8',
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    if (result.status !== 0) {
        throw new Error(`Failed to install ms-toolsai.jupyter: exit code ${result.status}`);
    }
}

main();
