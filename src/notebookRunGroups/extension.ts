import * as vscode from 'vscode';
import { startup } from './startup';

export function activate(context: vscode.ExtensionContext) {
	console.log('vscode-notebook-groups extension activated');

	// Startup
	startup(context);
}

export function deactivate() {}
