'use strict';

import * as vscode from 'vscode';
import { IWebviewView, IWebviewViewMessageListener, IWebviewViewProvider, Resource } from '../types';

import { WebviewHost } from './webviewHost';

export abstract class WebviewViewHost<IMapping> extends WebviewHost<IMapping> implements vscode.Disposable {
    protected get isDisposed(): boolean {
        return this.disposed;
    }

    private messageListener: IWebviewViewMessageListener;

    constructor(
        protected provider: IWebviewViewProvider,
        messageListenerCtor: (
            callback: (message: string, payload: {}) => void,
            disposed: () => void
        ) => IWebviewViewMessageListener,
        rootPath: string,
        scripts: string[]
    ) {
        super(rootPath, scripts);

        // Create our message listener for our web panel.
        this.messageListener = messageListenerCtor(this.onMessage.bind(this), this.dispose.bind(this));
    }

    protected async provideWebview(
        cwd: string,
        workspaceFolder: Resource,
        vscodeWebview?: vscode.WebviewView
    ): Promise<IWebviewView> {
        if (!vscodeWebview) {
            throw new Error('WebviewViews must be passed an initial VS Code Webview');
        }
        return this.provider.create({
            additionalPaths: workspaceFolder ? [workspaceFolder.fsPath] : [],
            rootPath: this.rootPath,
            cwd,
            listener: this.messageListener,
            scripts: this.scripts,
            webviewHost: vscodeWebview
        });
    }
}
