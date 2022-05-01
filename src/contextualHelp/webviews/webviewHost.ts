'use strict';

import * as vscode from 'vscode';
import { createDeferred, Deferred } from '../common/async';
import { SharedMessages } from '../messages';
import { IWebview, Resource } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export abstract class WebviewHost<IMapping> implements vscode.Disposable {
    protected abstract get title(): string;
    protected webview?: IWebview;

    protected abstract get owningResource(): Resource;

    protected disposed = false;

    protected themeIsDarkPromise: Deferred<boolean> | undefined = createDeferred<boolean>();

    protected webviewInit: Deferred<void> | undefined = createDeferred<void>();

    protected readonly _disposables: vscode.Disposable[] = [];

    protected get onDidDispose() {
        return this._onDidDisposeWebviewPanel.event;
    }

    protected _onDidDisposeWebviewPanel = new vscode.EventEmitter<void>();

    constructor(
        protected rootPath: string,
        protected scripts: string[]
    ) {
    }

    public dispose() {
        if (!this.disposed) {
            this.disposed = true;
            this.themeIsDarkPromise = undefined;
            this._disposables.forEach((item) => item.dispose());
        }

        this.webviewInit = undefined;
        this._onDidDisposeWebviewPanel.fire();
    }


    protected abstract provideWebview(
        cwd: string,
        workspaceFolder: Resource,
        vscodeWebview?: vscode.WebviewPanel | vscode.WebviewView
    ): Promise<IWebview>;

    protected asWebviewUri(localResource: vscode.Uri) {
        if (!this.webview) {
            throw new Error('asWebViewUri called too early');
        }
        return this.webview?.asWebviewUri(localResource);
    }

    protected postMessage<M extends IMapping, T extends keyof M>(type: T, payload?: M[T]): Promise<void> {
        // Then send it the message
        return this.postMessageInternal(type.toString(), payload);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected onMessage(message: string, payload: any) {
        switch (message) {
            case SharedMessages.Started:
                this.webViewRendered();
                break;

            default:
                break;
        }
    }

    protected async loadWebview(cwd: string, webView?: vscode.WebviewPanel | vscode.WebviewView) {
        // Make not disposed anymore
        this.disposed = false;

        // Setup our init promise for the web panel. We use this to make sure we're in sync with our
        // react control.
        this.webviewInit = this.webviewInit || createDeferred();

        // Create our web panel (it's the UI that shows up for the history)
        if (this.webview === undefined) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(cwd))?.uri;

            this.webview = await this.provideWebview(cwd, workspaceFolder, webView);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async postMessageInternal(type: string, payload?: any): Promise<void> {
        if (this.webviewInit) {
            // Make sure the webpanel is up before we send it anything.
            await this.webviewInit.promise;

            // Then send it the message
            this.webview?.postMessage({ type: type.toString(), payload });
        }
    }

    // When the webview has been rendered send telemetry and initial strings + settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected webViewRendered() {
        if (this.webviewInit && !this.webviewInit.resolved) {
            // Resolve our started promise. This means the webpanel is ready to go.
            this.webviewInit.resolve();
        }

    }
}
