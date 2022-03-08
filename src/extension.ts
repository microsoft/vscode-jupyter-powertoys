import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('vscode-jupyter-powertoys.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from vscode-jupyter-powertoys!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
