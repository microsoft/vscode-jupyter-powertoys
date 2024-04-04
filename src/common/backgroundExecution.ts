// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CancellationToken, type Disposable, type NotebookCellOutput, type NotebookCellOutputItem } from 'vscode';
import { Kernel } from '@vscode/jupyter-extension';
import { raceCancellation } from './cancellation';
import type * as nbformat from '@jupyterlab/nbformat';

export const executionCounters = new WeakMap<Kernel, number>();
export async function execCodeInBackgroundThread<T>(
    kernel: Kernel,
    codeWithReturnStatement: string[],
    token: CancellationToken
) {
    const counter = executionCounters.get(kernel) || 0;
    executionCounters.set(kernel, counter + 1);
    const mime = `application/vnd.vscode.bg.execution.${counter}`;
    const mimeFinalResult = `application/vnd.vscode.bg.execution.${counter}.result`;
    let displayId = '';

    const codeToSend = `
def __jupyter_exec_powerToys_background__():
    from IPython.display import display
    from threading import Thread

    # First send a dummy response to get the display id.
    # Later we'll send the real response with the actual data.
    # And that can happen much later even after the execution completes,
    # as that response will be sent from a bg thread.
    output = display({"${mime}": ""}, raw=True, display_id=True)

    def do_implementation():
        ${codeWithReturnStatement.map((l, i) => (i === 0 ? l : `        ${l}`)).join('\n')}

    def bg_main():
        try:
            output.update({"${mimeFinalResult}": do_implementation()}, raw=True)
        except:
            pass


    Thread(target=bg_main, daemon=True).start()


__jupyter_exec_powerToys_background__()
del __jupyter_exec_powerToys_background__
`.trim();
    const disposables: Disposable[] = [];
    disposables.push(token.onCancellationRequested(() => disposables.forEach((d) => d.dispose())));
    const promise = raceCancellation(
        token,
        new Promise<T | undefined>((resolve, reject) => {
            disposables.push(
                kernel.onDidReceiveDisplayUpdate(async (output: NotebookCellOutput) => {
                    if (token.isCancellationRequested) {
                        return resolve(undefined);
                    }
                    const metadata = getNotebookCellOutputMetadata(output);
                    if (!displayId || metadata?.transient?.display_id !== displayId) {
                        return;
                    }
                    const result = output.items.find((item) => item.mime === mimeFinalResult);
                    if (!result) {
                        return;
                    }

                    try {
                        return resolve(JSON.parse(new TextDecoder().decode(result.data)) as T);
                    } catch (ex) {
                        console.error('Failed to parse the result', ex);
                        return reject(new Error(`Failed to parse the result ${ex}`));
                    }
                })
            );
        })
    );

    const outputs = kernel.executeCode(codeToSend, token);
    for await (const output of outputs) {
        if (token.isCancellationRequested) {
            return;
        }
        const metadata = getNotebookCellOutputMetadata(output);
        if (!metadata?.transient?.display_id) {
            continue;
        }
        const result = output.items.find((item) => item.mime === mime || item.mime === mimeFinalResult);
        if (!result) {
            continue;
        }
        if (result.mime === mime) {
            displayId = metadata.transient.display_id;
            continue;
        }
        if (result.mime === mimeFinalResult && displayId === metadata.transient.display_id) {
            return JSON.parse(new TextDecoder().decode(result.data)) as T;
        }
    }
    if (token.isCancellationRequested) {
        return;
    }
    if (!displayId) {
        console.log('Failed to get display id for completions');
        return;
    }

    return promise;
}

export function getNotebookCellOutputMetadata(output: {
    items: NotebookCellOutputItem[];
    metadata?: { [key: string]: unknown };
}): CellOutputMetadata | undefined {
    return output.metadata as CellOutputMetadata | undefined;
}

/**
 * Metadata we store in VS Code cell output items.
 * This contains the original metadata from the Jupyuter Outputs.
 */
interface CellOutputMetadata {
    /**
     * Cell output metadata.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
    /**
     * Transient data from Jupyter.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transient?: {
        /**
         * This is used for updating the output in other cells.
         * We don't know of others properties, but this is definitely used.
         */
        display_id?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };
    /**
     * Original cell output type
     */
    outputType: nbformat.OutputType | string;
    executionCount?: nbformat.IExecuteResult['ExecutionCount'];
    /**
     * Whether the original Mime data is JSON or not.
     * This properly only exists in metadata for NotebookCellOutputItems
     * (this is something we have added)
     */
    __isJson?: boolean;
    /**
     * Whether to display the open plot icon.
     */
    __displayOpenPlotIcon?: boolean;
}


const replacements: [toEscape: RegExp, replacement: string][] = [
    [new RegExp('\\\\', 'g'), '\\\\'],
    [new RegExp('"', 'g'), '\\"'],
    [new RegExp("'", 'g'), `\'`],
    [new RegExp('\\\b', 'g'), '\\b'],
    [new RegExp('\\f', 'g'), '\\f'],
    [new RegExp('\\n', 'g'), '\\n'],
    [new RegExp('\\r', 'g'), '\\r'],
    [new RegExp('\\t', 'g'), '\\t']
];

export function escapeStringToEmbedInPythonCode(value: string | undefined): string | undefined {
    if (typeof value !== 'string') {
        return value;
    }
    for (const [toEscape, replacement] of replacements) {
        value = value.replace(toEscape, replacement);
    }
    return value;
}
