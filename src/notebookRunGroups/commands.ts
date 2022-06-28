// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { getCellRunGroupMetadata, updateCellRunGroupMetadata } from './util/cellMetadataHelpers';
import { updateContextKeys } from './contextKeys';
import { RunGroup } from './enums';
import { log } from './util/logging';

// Register our commands for run groups
export function registerCommands(context: vscode.ExtensionContext) {
    // Register add commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.addGroup1', (args) => {
            addToGroup(RunGroup.one, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.addGroup2', (args) => {
            addToGroup(RunGroup.two, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.addGroup3', (args) => {
            addToGroup(RunGroup.three, argNotebookCell(args));
        })
    );

    // Register remove commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.removeGroup1', (args) => {
            removeFromGroup(RunGroup.one, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.removeGroup2', (args) => {
            removeFromGroup(RunGroup.two, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.removeGroup3', (args) => {
            removeFromGroup(RunGroup.three, argNotebookCell(args));
        })
    );

    // Register execute commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.executeGroup1', (args) => {
            executeGroup(RunGroup.one, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.executeGroup2', (args) => {
            executeGroup(RunGroup.two, argNotebookCell(args));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-notebook-groups.executeGroup3', (args) => {
            executeGroup(RunGroup.three, argNotebookCell(args));
        })
    );
}

// Is the given argument a vscode NotebookCell?
function argNotebookCell(args: any): vscode.NotebookCell | undefined {
    // Check to see if we have a notebook cell for command context. Kinda ugly? Maybe a better way to do this.
    if (args && 'index' in args && 'kind' in args && 'notebook' in args && 'document' in args) {
        return args as vscode.NotebookCell;
    }

    log('Non-NotebookCell passed to cell based notebook group function');
    return undefined;
}

// Execute the given target run group. If a cell is specified use that document, if not find the active doc
function executeGroup(targetRunGroup: RunGroup, notebookCell?: vscode.NotebookCell) {
    let doc = notebookCell?.notebook;

    // If we didn't get a cell passed in, just take the active documents
    if (!doc) {
        doc = vscode.window.activeNotebookEditor?.notebook;
        doc || log('Execute group called without a valid document to execute');
    }

    // Collect our cell indexes
    const targetCells = doc
        ?.getCells()
        .filter((notebookCell) => cellInGroup(notebookCell, targetRunGroup))
        .map((cell) => {
            return { start: cell.index, end: cell.index + 1 };
        });

    // Execute the cells
    vscode.commands.executeCommand('notebook.cell.execute', { ranges: targetCells });
}

// Determine if a cell is in a given run group
function cellInGroup(cell: vscode.NotebookCell, targetRunGroup: RunGroup) {
    const currentValue = getCellRunGroupMetadata(cell);

    if (currentValue.includes(targetRunGroup.toString())) {
        return true;
    }

    return false;
}

// For the target cell, add it to the given run group
function addToGroup(targetRunGroup: RunGroup, notebookCell?: vscode.NotebookCell) {
    // If we were not passed in a cell, look for one
    if (!notebookCell) {
        notebookCell = getCurrentActiveCell();
        if (!notebookCell) {
            return;
        }
    }

    addGroupToCustomMetadata(notebookCell, targetRunGroup);

    // Always update the context keys and cell status after add / remove
    updateContextKeys();
}

// Remove the given cell from the specified run group
function removeFromGroup(targetRunGroup: RunGroup, notebookCell?: vscode.NotebookCell) {
    // If we were not passed in a cell, look for one
    if (!notebookCell) {
        notebookCell = getCurrentActiveCell();
        if (!notebookCell) {
            return;
        }
    }

    removeGroupFromCustomMetadata(notebookCell, targetRunGroup);

    // Always update the context keys and cell status after add / remove
    updateContextKeys();
}

// Find the current active notebook document and the current active cell in it
function getCurrentActiveCell(): vscode.NotebookCell | undefined {
    const activeNotebook = vscode.window.activeNotebookEditor;

    if (activeNotebook) {
        // || is ok here as 0 index is the same as the default value
        const selectedCellIndex = activeNotebook?.selections[0]?.start || 0;

        return activeNotebook.notebook.cellCount >= 1 ? activeNotebook.notebook.cellAt(selectedCellIndex) : undefined;
    }
}

function removeGroupFromCustomMetadata(notebookCell: vscode.NotebookCell, targetRunGroup: RunGroup) {
    const currentValue = getCellRunGroupMetadata(notebookCell);

    if (!currentValue.includes(targetRunGroup.toString())) {
        // Not there, can't remove
        log('Given run group is not present, so cannot be removed from.');
        return;
    }

    // Add in our group value and update the cell metadata
    const newValue = currentValue.replace(targetRunGroup.toString(), '');
    updateCellRunGroupMetadata(notebookCell, newValue);

    log(`Removing from group Cell Index: ${notebookCell.index} Groups Value: ${targetRunGroup.toString()}`);
}

function addGroupToCustomMetadata(notebookCell: vscode.NotebookCell, targetRunGroup: RunGroup) {
    const currentValue = getCellRunGroupMetadata(notebookCell);

    if (currentValue.includes(targetRunGroup.toString())) {
        // Already there, return
        log('Attempted to add cell to a group it is already in');
        return;
    }

    // Add in our group value
    const newValue = currentValue.concat(targetRunGroup.toString());
    updateCellRunGroupMetadata(notebookCell, newValue);

    log(`Adding to group Cell Index: ${notebookCell.index} Groups Value: ${newValue}`);
}
