// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { activateNotebookRunGroups } from './notebookRunGroups/startup';
import { activate as activateKernelManagement } from './kernelManager/extension';

export async function activate(context: vscode.ExtensionContext) {
    // All PowerToy features should have a top level enable / disable setting
    // When disabled don't show the feature at all (also hide commands)

    // Notebook Run Groups
    if (vscode.workspace.getConfiguration('jupyter').get('notebookRunGroups.enabled')) {
        activateNotebookRunGroups(context);
    }
    await activateKernelManagement(context);
}

export function deactivate() {}
