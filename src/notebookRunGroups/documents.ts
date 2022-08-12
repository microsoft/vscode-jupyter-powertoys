// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { updateContextKeys } from './contextKeys';

export function registerDocuments(context: vscode.ExtensionContext) {
    // Sign up for any document opens that we get
    context.subscriptions.push(vscode.workspace.onDidOpenNotebookDocument(documentOpen));

    // We need to update context keys when documents are swapped to update the top level toolbar commands
    context.subscriptions.push(vscode.window.onDidChangeActiveNotebookEditor(notebookEditorChanged));

    // Update our initial context keys
    updateContextKeys();
}

function notebookEditorChanged() {
    updateContextKeys();
}

function documentOpen(document: vscode.NotebookDocument) {
    updateContextKeys();
}
