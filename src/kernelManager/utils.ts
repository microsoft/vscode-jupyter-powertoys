// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { languages, Uri, WorkspaceFolder } from 'vscode';
import * as path from '../vscode-path/path';
import { languageAliases, languages as knownLanguages } from './languages';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const untildify = require('untildify');

const homePath = untildify('~');
export function getDisplayPath(
    filename?: string | Uri,
    workspaceFolders: readonly WorkspaceFolder[] | WorkspaceFolder[] = []
) {
    const relativeToHome = getDisplayPathImpl(filename);
    const relativeToWorkspaceFolders = workspaceFolders.map((folder) =>
        getDisplayPathImpl(filename, folder.uri.fsPath)
    );
    // Pick the shortest path for display purposes.
    // As those are most likely relative to some workspace folder.
    let bestDisplayPath = relativeToHome;
    [relativeToHome, ...relativeToWorkspaceFolders].forEach((relativePath) => {
        if (relativePath.length < bestDisplayPath.length) {
            bestDisplayPath = relativePath;
        }
    });

    return bestDisplayPath;
}

function getDisplayPathImpl(filename?: string | Uri, cwd?: string): string {
    let file = '';
    if (typeof filename === 'string') {
        file = filename;
    } else if (!filename) {
        file = '';
    } else if (filename.scheme === 'file') {
        file = filename.fsPath;
    } else {
        file = filename.toString();
    }
    if (!file) {
        return '';
    } else if (cwd && file.startsWith(cwd)) {
        const relativePath = `.${path.sep}${path.relative(cwd, file)}`;
        // On CI the relative path might not work as expected as when testing we might have windows paths
        // and the code is running on a unix machine.
        return relativePath === file || relativePath.includes(cwd)
            ? `.${path.sep}${file.substring(file.indexOf(cwd) + cwd.length)}`
            : relativePath;
    } else if (file.startsWith(homePath)) {
        return `~${path.sep}${path.relative(homePath, file)}`;
    } else {
        return file;
    }
}

const knownVSCodeLanguages = new Set<string>();

export function getLanguageExtension(language?: string) {
    if (!language) {
        return '.ipynb';
    }
    const aliases = languageAliases.get(language.toLowerCase()) || [language];
    // If VS Code doesn't know any of these languages (nor the aliases),
    // Then we're unlikely to get icons in the tree view, hence default to `.ipynb` icon for these.
    if (!aliases.some((alias) => knownVSCodeLanguages.has(alias))) {
        return '.ipynb';
    }

    for (const alias of aliases) {
        if (knownLanguages.has(alias)) {
            return knownLanguages.get(alias)![0];
        }
    }
    return '.ipynb';
}

export async function initializeKnownLanguages() {
    const langs = await languages.getLanguages();
    langs.forEach((language) => knownVSCodeLanguages.add(language.toLowerCase()));
}
