// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
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
