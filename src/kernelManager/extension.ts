// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, window, extensions } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { JupyterAPI } from './vscodeJupyter';
import { KernelTreeView } from './kernelTreeView';
import { initializeKnownLanguages } from './utils';
import { CommandHandler } from './commandHandler';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
	void initializeKnownLanguages();
    const jupyterExt = extensions.getExtension<JupyterAPI>('ms-toolsai.jupyter');
    if (!jupyterExt) {
        return;
    }
    await jupyterExt.activate();
    const kernelService = await jupyterExt.exports.getKernelService();
    if (!kernelService) {
		return;
	}
	CommandHandler.register(kernelService, context);
	KernelTreeView.register(kernelService, context.subscriptions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
