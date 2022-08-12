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
    const group1Cells: Set<vscode.Uri> = new Set<vscode.Uri>();
    const group2Cells: Set<vscode.Uri> = new Set<vscode.Uri>();
    const group3Cells: Set<vscode.Uri> = new Set<vscode.Uri>();

    // Groups for what documents have any cells in a group active
    const group1Documents: Set<vscode.Uri> = new Set<vscode.Uri>();
    const group2Documents: Set<vscode.Uri> = new Set<vscode.Uri>();
    const group3Documents: Set<vscode.Uri> = new Set<vscode.Uri>();
    
    // Scan visible notebooks
    vscode.workspace.notebookDocuments.forEach((notebookDocument) => {
        notebookDocument.getCells().forEach((cell) => {
            // Check each cell for group membership and assign it to any group buckets
            const cellGroups = getCellRunGroupMetadata(cell);

            if (cellGroups.includes(RunGroup.one.toString())) {
                group1Cells.add(cell.document.uri);
                group1Documents.add(cell.notebook.uri);
            }
            if (cellGroups.includes(RunGroup.two.toString())) {
                group2Cells.add(cell.document.uri);
                group2Documents.add(cell.notebook.uri);
            }
            if (cellGroups.includes(RunGroup.three.toString())) {
                group3Cells.add(cell.document.uri);
                group3Documents.add(cell.notebook.uri);
            }
        });
    });

    // Set the actual contexts
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupOneCells', Array.from(group1Cells));
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupOneDocuments', Array.from(group1Documents));
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupTwoCells', Array.from(group2Cells));
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupTwoDocuments', Array.from(group2Documents));
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupThreeCells', Array.from(group3Cells));
    vscode.commands.executeCommand('setContext', 'notebookRunGroups.groupThreeDocuments', Array.from(group3Documents));
}
