// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// Code for working with the VS Code cell status bar to indicate group memberships
import * as vscode from 'vscode';
import { getCellRunGroupMetadata } from './util/cellMetadataHelpers';
import { RunGroup } from './enums';

// Register our provider
export function registerCellStatusBarProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.notebooks.registerNotebookCellStatusBarItemProvider('*', { provideCellStatusBarItems } ));
}

// Check the cell metadata and generate a string to show group membership
function provideCellStatusBarItems(cell: vscode.NotebookCell, token: vscode.CancellationToken): vscode.ProviderResult<vscode.NotebookCellStatusBarItem> {
    const cellRunGroups = getCellRunGroupMetadata(cell);
    const groupStrings = [];

    if (cellRunGroups.includes(RunGroup.one.toString())) {
        groupStrings.push('Group 1');
    }
    if (cellRunGroups.includes(RunGroup.two.toString())) {
        groupStrings.push('Group 2');
    }
    if (cellRunGroups.includes(RunGroup.three.toString())) {
        groupStrings.push('Group 3');
    }

    return { text: groupStrings.join(' '), alignment: vscode.NotebookCellStatusBarAlignment.Left }; 
}
