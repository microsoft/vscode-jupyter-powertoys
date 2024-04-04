'use strict';

import type * as nbformat from '@jupyterlab/nbformat';
import * as path from 'path';
import * as vscode from 'vscode';
import { logError } from './common/logging';
import { isNotebookCell } from './common/utils';
import { Identifiers } from './constants';
import { disposables } from './extension';
import { IExportedKernelService, JupyterAPI, type KernelConnectionMetadata } from './jupyter-extension/types';
import { MessageMapping, WindowMessages } from './messages';
import { StatusProvider } from './statusProvider';
import { Resource, IWebviewViewProvider, IStatusParticipant } from './types';
import { createCodeCell } from './ui/common/cellFactory';
import { CellState, ICell } from './ui/common/types';
import { SimpleMessageListener } from './webviews/simpleMessageListener';
import { WebviewViewHost } from './webviews/webviewViewHost';
import type { Jupyter, Kernel } from '@vscode/jupyter-extension';
import { escapeStringToEmbedInPythonCode, execCodeInBackgroundThread } from '../common/backgroundExecution';
import type { IInspectReplyMsg } from '@jupyterlab/services/lib/kernel/messages';
import type { ISessionConnection } from '@jupyterlab/services/lib/session/session';

const root = path.join(__dirname, 'ui', 'viewers');

// This is the client side host for the contextual help (shown in the jupyter tab)
export class ContextualHelp extends WebviewViewHost<MessageMapping> implements vscode.Disposable, IStatusParticipant {
    private vscodeWebView: vscode.WebviewView | undefined;
    private unfinishedCells: ICell[] = [];
    private potentiallyUnfinishedStatus: vscode.Disposable[] = [];
    private notebookCellMap = new Map<string, ICell>();
    private kernelService: IExportedKernelService | undefined;

    protected get owningResource(): Resource {
        if (vscode.window.activeNotebookEditor?.notebook) {
            return vscode.window.activeNotebookEditor.notebook.uri;
        }
        return undefined;
    }
    constructor(provider: IWebviewViewProvider, private readonly statusProvider: StatusProvider) {
        super(provider, (c, d) => new SimpleMessageListener(c, d), root, [path.join(root, 'contextualHelp.js')]);

        // Sign up if the active variable view notebook is changed, restarted or updated
        vscode.window.onDidChangeActiveNotebookEditor(this.activeEditorChanged, this, disposables);
        vscode.window.onDidChangeTextEditorSelection(this.activeSelectionChanged, this, disposables);
    }

    // Used to identify this webview in telemetry, not shown to user so no localization
    // for webview views
    public get title(): string {
        return 'contextualHelp';
    }
    private lastHelpRequest?: {
        token: vscode.CancellationTokenSource;
        code: string;
        cursor_pos: number;
        lineNumber: number;
        word: string;
        wordAtPos: string;
        document: vscode.TextDocument;
        timer?: NodeJS.Timeout;
    };
    public showHelp(editor: vscode.TextEditor) {
        // Code should be the entire cell
        const code = editor.document.getText();

        // Cursor position should be offset in that cell
        const cursor_pos = editor.document.offsetAt(editor.selection.active);

        // Word under cursor can be computed from the line
        const lineNumber = editor.selection.active.line;
        const line = editor.document.lineAt(editor.selection.active.line).text;
        // Find first quote, parenthesis or space to the left
        let start = editor.selection.active.character;
        let end = editor.selection.active.character + 1;
        const wordPos = editor.document.getWordRangeAtPosition(editor.selection.active);
        const wordAtPos = wordPos ? editor.document.getText(wordPos) : '';
        let startFound = false;
        let endFound = false;
        while (!startFound || !endFound) {
            const startChar = start > 0 ? line[start - 1] : ' ';
            const endChar = end < line.length ? line[end] : ' ';
            startFound = /[\s\(\)\[\]'"]+/.test(startChar);
            endFound = /[\s\(\)\[\]'"]+/.test(endChar);
            if (!startFound) {
                start--;
            }
            if (!endFound) {
                end++;
            }
        }
        const word = line.slice(start, end);
        if (
            this.lastHelpRequest?.code === code &&
            (this.lastHelpRequest?.cursor_pos === cursor_pos || this.lastHelpRequest?.lineNumber === lineNumber) &&
            this.lastHelpRequest?.word === word &&
            this.lastHelpRequest?.wordAtPos === wordAtPos
        ) {
            return;
        }
        if (this.lastHelpRequest?.token) {
            this.lastHelpRequest.token.cancel();
        }
        if (this.lastHelpRequest?.timer) {
            clearTimeout(this.lastHelpRequest.timer);
        }
        const token = new vscode.CancellationTokenSource();
        // lets wait a while before showing the help
        // We need to wait for the user to stop typing before we show the help
        // Or possible user is tabbing through cells/files, etc
        const timer = setTimeout(() => {
            // Make our inspect request
            this.inspect(code, cursor_pos, word, editor.document, token.token).finally(() => {
                token.dispose();
            });
        }, 300);

        this.lastHelpRequest = {
            code,
            cursor_pos,
            word,
            lineNumber,
            wordAtPos,
            document: editor.document,
            token,
            timer
        };
    }

    public async load(codeWebview: vscode.WebviewView) {
        this.vscodeWebView = codeWebview;
        await super.loadWebview(process.cwd(), codeWebview).catch(logError);

        // Set the title if there is an active notebook
        if (this.vscodeWebView) {
            await this.activeEditorChanged(vscode.window.activeNotebookEditor);
        }

        // The UI requires us to say we have cells.
        this.postMessage(WindowMessages.LoadAllCells, {
            cells: [],
            isNotebookTrusted: true
        });
    }

    public startProgress() {
        this.postMessage(WindowMessages.StartProgress);
    }

    public stopProgress() {
        this.postMessage(WindowMessages.StopProgress);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected onMessage(message: string, payload: any) {
        switch (message) {
            case WindowMessages.Started:
                break;
            default:
                break;
        }

        // Pass onto our base class.
        super.onMessage(message, payload);
    }

    protected postMessage<M extends MessageMapping, T extends keyof M>(type: T, payload?: M[T]): Promise<void> {
        // Then send it to the webview
        return super.postMessage(type, payload);
    }

    // Handle message helper function to specifically handle our message mapping type
    protected handleMessage<M extends MessageMapping, T extends keyof M>(
        _message: T,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: any,
        handler: (args: M[T]) => void
    ) {
        const args = payload as M[T];
        handler.bind(this)(args);
    }

    protected sendCellsToWebView(cells: ICell[]) {
        // Send each cell to the other side
        cells.forEach((cell: ICell) => {
            switch (cell.state) {
                case CellState.init:
                    // Tell the react controls we have a new cell
                    this.postMessage(WindowMessages.StartCell, cell);

                    // Keep track of this unfinished cell so if we restart we can finish right away.
                    this.unfinishedCells.push(cell);
                    break;

                case CellState.executing:
                    // Tell the react controls we have an update
                    this.postMessage(WindowMessages.UpdateCellWithExecutionResults, cell);
                    break;

                case CellState.error:
                case CellState.finished:
                    // Tell the react controls we're done
                    this.postMessage(WindowMessages.FinishCell, {
                        cell,
                        notebookIdentity: this.owningResource!
                    });

                    // Remove from the list of unfinished cells
                    this.unfinishedCells = this.unfinishedCells.filter((c) => c.id !== cell.id);
                    break;

                default:
                    break; // might want to do a progress bar or something
            }
        });

        // Update our current cell state
        if (this.owningResource) {
            this.notebookCellMap.set(this.owningResource.toString(), cells[0]);
        }
    }

    protected setStatus = (message: string, showInWebView: boolean): vscode.Disposable => {
        const result = this.statusProvider.set(message, showInWebView, undefined, undefined, this);
        this.potentiallyUnfinishedStatus.push(result);
        return result;
    };

    protected async inspect(
        code: string,
        cursor_pos: number,
        word: string,
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<boolean> {
        let result = true;
        // Skip if notebook not set
        if (!this.owningResource) {
            return result;
        }

        // Start a status item
        const status = this.setStatus('Executing code', false);

        try {
            // Make sure we're loaded first.
            const content = await this.doInspect(code, cursor_pos, document, token);
            if (content && content.status === 'ok' && 'text/plain' in content.data) {
                const output: nbformat.IStream = {
                    output_type: 'stream',
                    text: [content.data['text/plain']!.toString()],
                    name: 'stdout',
                    metadata: {},
                    execution_count: 1
                };

                // Turn this into a cell (shortcut to displaying it)
                const cell: ICell = {
                    id: '1',
                    file: Identifiers.EmptyFileName,
                    line: 0,
                    state: CellState.finished,
                    data: createCodeCell([word], [output])
                };
                cell.data.execution_count = 1;

                // Then send the combined output to the UI
                this.sendCellsToWebView([cell]);
            } else {
                // Otherwise empty it out.
                const cell: ICell = {
                    id: '1',
                    file: Identifiers.EmptyFileName,
                    line: 0,
                    state: CellState.finished,
                    data: createCodeCell(word)
                };
                cell.data.execution_count = 0;

                // Then send the combined output to the UI
                this.sendCellsToWebView([cell]);
            }
        } finally {
            status.dispose();
        }

        return result;
    }
    private pendingRequests = new WeakMap<
        | Kernel
        | {
              metadata: KernelConnectionMetadata;
              connection: ISessionConnection;
          },
        Promise<unknown>
    >();
    private async doInspect(
        code: string,
        cursor_pos: number,
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ) {
        if (!code || code.length === 0) {
            return;
        }
        const notebook = vscode.workspace.notebookDocuments.find((n) =>
            n.getCells().find((c) => c.document.uri.toString() === document.uri.toString())
        );
        if (!notebook) {
            return;
        }
        const jupyterExt = vscode.extensions.getExtension<Jupyter>('ms-toolsai.jupyter');
        if (!jupyterExt?.isActive) {
            return;
        }
        if (!jupyterExt.isActive) {
            await jupyterExt.activate();
        }
        // Determine help level
        const config = vscode.workspace.getConfiguration('jupyter');
        const detail_level = config.get('contextualHelp.detailLevel', 'normal') === 'normal' ? 0 : 1;

        const kernel = await jupyterExt.exports.kernels.getKernel(notebook.uri);
        if (!kernel || token.isCancellationRequested) {
            return;
        }
        // We do not want more than one request at a time.
        if (this.pendingRequests.has(kernel)) {
            return;
        }

        let promise: Promise<IInspectReplyMsg['content'] | undefined>;
        if (kernel?.language === 'python') {
            // This is more efficient as we can run the code in a background thread.
            const codeToExecute = `return get_ipython().kernel.do_inspect("${escapeStringToEmbedInPythonCode(
                code
            )}", ${cursor_pos}, ${detail_level})`;
            promise = execCodeInBackgroundThread<IInspectReplyMsg['content']>(kernel, [codeToExecute], token);
        } else {
            const oldKernel = await this.getKernel(notebook);
            if (!oldKernel?.connection.kernel) {
                return;
            }
            promise = oldKernel.connection.kernel
                .requestInspect({ code, cursor_pos, detail_level })
                .then((result) => result.content);
        }

        this.pendingRequests.set(kernel, promise);
        const content = await promise
            .catch((ex) => {
                console.error(`Failed to inspect for ${code} @ ${cursor_pos} in ${notebook.uri}`, ex);
                return;
            })
            .finally(() => {
                if (this.pendingRequests.get(kernel) === promise) {
                    this.pendingRequests.delete(kernel);
                }
            });

        return content;
    }
    private async activeEditorChanged(editor: vscode.NotebookEditor | undefined) {
        // Update the state of the control based on editor
        await this.postMessage(WindowMessages.HideUI, editor === undefined);

        // Show help right now if the active text editor is a notebook cell
        if (vscode.window.activeTextEditor && isNotebookCell(vscode.window.activeTextEditor.document)) {
            this.showHelp(vscode.window.activeTextEditor);
        }
    }
    private async activeSelectionChanged(e: vscode.TextEditorSelectionChangeEvent) {
        if (isNotebookCell(e.textEditor.document)) {
            this.showHelp(e.textEditor);
        }
    }

    private async activeNotebookSelectionChanged(e: vscode.NotebookEditorSelectionChangeEvent) {
        // Find the matching text editor for the cell we just switched to
        const cell = e.notebookEditor.notebook.cellAt(e.selections[0].start);
        if (cell) {
            const editor = vscode.window.visibleTextEditors.find((e) => e.document === cell.document);
            if (editor) {
                this.showHelp(editor);
            }
        }
    }

    private async activeKernelChanged() {
        // Show help right now if the active text editor is a notebook cell
        if (vscode.window.activeTextEditor && isNotebookCell(vscode.window.activeTextEditor.document)) {
            this.showHelp(vscode.window.activeTextEditor);
        }
    }

    private async getKernel(notebook: vscode.NotebookDocument) {
        if (!this.kernelService) {
            // Load the jupyter extension if possible
            const extension = vscode.extensions.getExtension<JupyterAPI>('ms-toolsai.jupyter');
            if (extension) {
                await extension.activate();
                this.kernelService = await extension.exports.getKernelService();
                this.kernelService?.onDidChangeKernels(this.activeKernelChanged, this, disposables);
            }
        }
        return this.kernelService ? this.kernelService.getKernel(notebook.uri) : undefined;
    }
}
