// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Constants } from './constants';
import { ContextualHelpProvider } from './contextualHelpProvider';

const helpProvider = new ContextualHelpProvider();
export let disposables: vscode.Disposable[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	context.subscriptions.push(vscode.commands.registerCommand(Constants.OpenScratchPadInteractive, openScratchPadInteractive));

	context.subscriptions.push(vscode.commands.registerCommand(Constants.OpenContextualHelp, openContextualHelp));

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(helpProvider.viewType, helpProvider, {
		webviewOptions: { retainContextWhenHidden: true }
	}));
	
	disposables = context.subscriptions;
}

// this method is called when your extension is deactivated
export function deactivate() {}


function openScratchPadInteractive() {
	// TODO: Figure out how to create an interactive window and tell it what its kernel is (live kernel id?)
}

async function openContextualHelp(): Promise<void> {
	// For all contributed views vscode creates a command with the format [view ID].focus to focus that view
	// It's the given way to focus a single view so using that here, note that it needs to match the view ID
	await vscode.commands.executeCommand('jupyterContextualHelp.focus');
}
