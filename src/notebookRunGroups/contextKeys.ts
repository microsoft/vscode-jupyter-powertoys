// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { getCellRunGroupMetadata } from './util/cellMetadataHelpers';

// To work around some issues with context keys I'm only considering the currently selected cell for
// determining if I should show the remove or add buttons for each group. Long term I don't like this
// solution though, so looking for a way around it
export function updateContextKeys() {
    const activeSelections = vscode.window.activeNotebookEditor?.selections;

    if (activeSelections?.length) {
        const activeSelection = activeSelections[0];
        const activeCell = vscode.window.activeNotebookEditor?.document.cellAt(activeSelection.start);
        activeCell && setCellContextKeys(activeCell);
    }
}

// Add the specified cell to and out of any group context keys
function setCellContextKeys(cell: vscode.NotebookCell) {
    const currentValue = getCellRunGroupMetadata(cell);

    if (currentValue.includes('1')) {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupOne', true);
    } else {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupOne', false);
    }

    if (currentValue.includes('2')) {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupTwo', true);
    } else {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupTwo', false);
    }

    if (currentValue.includes('3')) {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupThree', true);
    } else {
        vscode.commands.executeCommand('setContext', 'notebookRunGroups.inGroupThree', false);
    }
}
