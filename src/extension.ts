import * as vscode from 'vscode';
import { activateNotebookRunGroups } from './notebookRunGroups/startup';

export function activate(context: vscode.ExtensionContext) {
    // All PowerToy features should have a top level enable / disable setting 
    // When disabled don't show the feature at all (also hide commands)

    // Notebook Run Groups
    if (vscode.workspace.getConfiguration('notebookRunGroups').get('enabled')) {
        activateNotebookRunGroups(context);
    }
}

export function deactivate() {}
