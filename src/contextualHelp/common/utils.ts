import * as vscode from 'vscode';
import { NotebookCellScheme } from '../constants';

/**
 * Checking whether something is a Uri.
 * Using `instanceof Uri` doesn't always work as the object is not an instance of Uri (at least not in tests).
 * That's why VSC too has a helper method `URI.isUri` (though not public).
 *
 * @export
 * @param {InterpreterUri} [resource]
 * @returns {resource is Uri}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUri(resource?: vscode.Uri | any): resource is vscode.Uri {
    if (!resource) {
        return false;
    }
    const uri = resource as vscode.Uri;
    return typeof uri.path === 'string' && typeof uri.scheme === 'string';
}

export function isNotebookCell(documentOrUri: vscode.TextDocument | vscode.Uri): boolean {
    const uri = isUri(documentOrUri) ? documentOrUri : documentOrUri.uri;
    return uri.scheme.includes(NotebookCellScheme);
}

export function isUntitledFile(file?: vscode.Uri) {
    return file?.scheme === 'untitled';
}
