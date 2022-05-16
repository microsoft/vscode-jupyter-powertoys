// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { activateNotebookRunGroups } from './notebookRunGroups/startup';
import { activate as activateKernelManagement } from './kernelManager/extension';
import { activate as activateContextualHelp } from './contextualHelp/extension';
import { activate as activateKernelSpy } from './kernelSpy/extension';

export async function activate(context: vscode.ExtensionContext) {
    // All PowerToy features should have a top level enable / disable setting
    // When disabled don't show the feature at all (also hide commands)

    // Notebook Run Groups
    if (vscode.workspace.getConfiguration('jupyter').get('notebookRunGroups.enabled')) {
        activateNotebookRunGroups(context);
    }
    await activateKernelManagement(context);
    await activateKernelSpy(context);
    if (vscode.workspace.getConfiguration('jupyter').get('contextualHelp.enabled')) {
        await activateContextualHelp(context);
    }
}

export function deactivate() {}
