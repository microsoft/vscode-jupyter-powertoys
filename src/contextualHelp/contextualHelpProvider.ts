'use strict';

import { CancellationToken, WebviewView, WebviewViewResolveContext } from 'vscode';
import { ContextualHelp } from './contextualHelp';
import { StatusProvider } from './statusProvider';
import { WebviewViewProvider } from './webviews/webviewViews/webviewViewProvider';

// This class creates our UI for our variable view and links it to the vs code webview view
export class ContextualHelpProvider {
    public readonly viewType = 'jupyterContextualHelp';
    private _contextualHelp?: ContextualHelp;

    private webviewProvider = new WebviewViewProvider();
    private statusProvider = new StatusProvider();

    constructor() {}

    public async resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken
    ): Promise<void> {
        webviewView.webview.options = { enableScripts: true, enableCommandUris: true };

        // Create our actual variable view
        this._contextualHelp = new ContextualHelp(this.webviewProvider, this.statusProvider);

        await this._contextualHelp.load(webviewView);
    }

    public get contextualHelp(): ContextualHelp | undefined {
        return this._contextualHelp;
    }
}
