// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { updateContextKeys } from './contextKeys';

export function registerDocuments(context: vscode.ExtensionContext) {
    // Sign up for any document opens that we get
    context.subscriptions.push(vscode.workspace.onDidOpenNotebookDocument(documentOpen));

    // Sign up for when the notebook editor selection changes
    context.subscriptions.push(vscode.window.onDidChangeNotebookEditorSelection(selectionChanged));

    // Update our initial context keys
    updateContextKeys();
}

// IANHU: Not needed anymore?
// IANHU: Perhaps replace with active document changed so we update the bigger UI items
function selectionChanged(value: any) {
    updateContextKeys();
}

function documentOpen(document: vscode.NotebookDocument) {
    updateContextKeys();
}
