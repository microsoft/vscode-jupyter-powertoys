import * as vscode from "vscode";
import { isFileNotFoundError } from "./errors";
import { logError } from "./logging";
import * as glob from 'glob';
import { promisify } from "util";

const globPromise: (pat: string, options?: { cwd: string; dot?: boolean }) => Promise<string[]> = promisify(glob);
const ENCODING = 'utf8';

async function localPathExists(
    // the "file" to look for
    filename: string,
    // the file type to expect; if not provided then any file type
    // matches; otherwise a mismatch results in a "false" value
    fileType?: vscode.FileType
): Promise<boolean> {
    let stat: vscode.FileStat;
    try {
        // Note that we are using stat() rather than lstat().  This
        // means that any symlinks are getting resolved.
        const uri = vscode.Uri.file(filename);
        stat = await vscode.workspace.fs.stat(uri);
    } catch (err) {
        if (isFileNotFoundError(err as any)) {
            return false;
        }
        logError(`stat() failed for "${filename}"`, err);
        return false;
    }

    if (fileType === undefined) {
        return true;
    }
    if (fileType === vscode.FileType.Unknown) {
        // FileType.Unknown == 0, hence do not use bitwise operations.
        return stat.type === vscode.FileType.Unknown;
    }
    return (stat.type & fileType) === fileType;
}

export async function searchLocal(globPattern: string, cwd?: string, dot?: boolean): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let options: any;
    if (cwd) {
        options = { ...options, cwd };
    }
    if (dot) {
        options = { ...options, dot };
    }

    const found = await globPromise(globPattern, options);
    return Array.isArray(found) ? found : [];
}

export async function localDirectoryExists(dirname: string): Promise<boolean> {
    return localPathExists(dirname, vscode.FileType.Directory);
}

export async function localFileExists(filename: string): Promise<boolean> {
    return localPathExists(filename, vscode.FileType.File);
}

export async function readFile(uri: vscode.Uri): Promise<string> {
    const result = await vscode.workspace.fs.readFile(uri);
    const data = Buffer.from(result);
    return data.toString(ENCODING);
}


export async function readLocalFile(filename: string): Promise<string> {
    const uri = vscode.Uri.file(filename);
    return readFile(uri);
}

export async function getFiles(dir: vscode.Uri): Promise<vscode.Uri[]> {
    const files = await vscode.workspace.fs.readDirectory(dir);
    return files.filter((f) => f[1] === vscode.FileType.File).map((f) => vscode.Uri.file(f[0]));
}
