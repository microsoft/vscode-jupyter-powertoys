import * as vscode from 'vscode';
import { log } from './util/logging';
import { registerCommands } from './commands';
import { registerDocuments } from './documents';
import { registerCellStatusBarProvider } from './cellStatusBar';

export function activateNotebookRunGroups(context: vscode.ExtensionContext) {
	// Register all of our commands
	registerCommands(context);

    // Register document handling
    registerDocuments(context);

    // Register cell status bar
    registerCellStatusBarProvider(context);
}
