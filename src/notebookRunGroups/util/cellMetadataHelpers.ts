// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';

// Retrieve the cell run group value
export function getCellRunGroupMetadata(cell: vscode.NotebookCell): string {
    const customMetadata = cell.metadata?.custom?.metadata?.notebookRunGroups;

    if (customMetadata && customMetadata.groupValue) {
        return customMetadata.groupValue;
    }

    // Empty string if we don't have custom metadata or the block is missing
    return '';
}

// Update cell metadata with the new run group value
export function updateCellRunGroupMetadata(cell: vscode.NotebookCell, newGroupValue: string) {
    const newMetadata = { ...(cell.metadata || {}) };
    newMetadata.custom = newMetadata.custom || {};
    newMetadata.custom.metadata = newMetadata.custom.metadata || {};
    newMetadata.custom.metadata.notebookRunGroups = newMetadata.custom.metadata.notebookRunGroups || {};

    // Replace the actual groupValue
    newMetadata.custom.metadata.notebookRunGroups.groupValue = newGroupValue;

    // Perform our actual replace and edit
    const wsEdit = new vscode.WorkspaceEdit();
    const notebookEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, newMetadata);
    wsEdit.set(cell.notebook.uri, [notebookEdit]);
    vscode.workspace.applyEdit(wsEdit);
}
