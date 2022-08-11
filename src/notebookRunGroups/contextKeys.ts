// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { RunGroup } from './enums';
import { getCellRunGroupMetadata } from './util/cellMetadataHelpers';

// Note, this scans all open notebook editors when run, the operation should be very quick so this feels clean
// and it's only triggered on more explicit user actions (doc open, metadata update) but can always
// revisit for perf inefficency
export function updateContextKeys() {
    // Create our groups for what cells are in each run group
    const group1Cells: vscode.Uri[] = [];
    const group2Cells: vscode.Uri[] = [];
    const group3Cells: vscode.Uri[] = [];
    
    // Track if the active notebook document has available groups for the top level menu commands
    // as we only want those to be enable if there is something in the active document to run
    let activeGroup1 = false;
    let activeGroup2 = false;
    let activeGroup3 = false;

    vscode.window.visibleNotebookEditors.forEach((notebookEditor) => {
        notebookEditor.notebook.getCells().forEach((cell) => {
            const cellGroups = getCellRunGroupMetadata(cell);

            if (cellGroups.includes(RunGroup.one.toString())) {
                group1Cells.push(cell.document.uri);
                if (notebookEditor === vscode.window.activeNotebookEditor) {
                    activeGroup1 = true;
                }
            }
            if (cellGroups.includes(RunGroup.two.toString())) {
                group2Cells.push(cell.document.uri);
                if (notebookEditor === vscode.window.activeNotebookEditor) {
                    activeGroup2 = true;
                }
            }
            if (cellGroups.includes(RunGroup.three.toString())) {
                group3Cells.push(cell.document.uri);
                if (notebookEditor === vscode.window.activeNotebookEditor) {
                    activeGroup3 = true;
                }
            }
        });
    });

    // Set the actual contexts
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupOneCells', group1Cells);
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupOneActive', activeGroup1);
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupTwoCells', group2Cells);
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupTwoActive', activeGroup2);
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupThreeCells', group3Cells);
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupThreeActive', activeGroup3);
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
