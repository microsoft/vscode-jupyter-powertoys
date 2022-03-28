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
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('jupyter-kernelManager.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        window.showInformationMessage('Hello World from vscode-kernel-manager!');
    });

    context.subscriptions.push(disposable);
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
