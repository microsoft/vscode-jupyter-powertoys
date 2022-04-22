import * as vscode from "vscode";

// Wraps a VS Code webview
export const IWebview = Symbol('IWebview');
export interface IWebview {
    /**
     * Event is fired when the load for a web panel fails
     */
    readonly loadFailed: vscode.Event<void>;
    /**
     * Sends a message to the hosted html page
     */
    postMessage(message: WebviewMessage): void;
    /**
     * Convert a uri for the local file system to one that can be used inside webviews.
     *
     * Webviews cannot directly load resources from the workspace or local file system using `file:` uris. The
     * `asWebviewUri` function takes a local `file:` uri and converts it into a uri that can be used inside of
     * a webview to load the same resource:
     *
     * ```ts
     * webview.html = `<img src="${webview.asWebviewUri(vscode.Uri.file('/Users/codey/workspace/cat.gif'))}">`
     * ```
     */
    asWebviewUri(localResource: vscode.Uri): vscode.Uri;
}

// Wraps the VS Code webview view
export const IWebviewView = Symbol('IWebviewView');
export interface IWebviewView extends IWebview {
    readonly onDidChangeVisiblity: vscode.Event<void>;
    readonly visible: boolean;
}

export interface IWebviewMessageListener extends vscode.Disposable {
    /**
     * Listens to webview messages
     * @param message: the message being sent
     * @param payload: extra data that came with the message
     */
    onMessage(message: string, payload: any): void;
}

export const IWebviewPanelMessageListener = Symbol('IWebviewPanelMessageListener');
export interface IWebviewPanelMessageListener extends IWebviewMessageListener {
    /**
     * Listens to web panel state changes
     */
    onChangeViewState(panel: vscode.WebviewPanel): void;
}

export const IWebviewViewMessageListener = Symbol('IWebviewViewMessageListener');
export interface IWebviewViewMessageListener extends IWebviewMessageListener {}

export type WebviewMessage = {
    /**
     * Message type
     */
    type: string;

    /**
     * Payload
     */
    payload?: any;
};

export type Resource = vscode.Uri | undefined;
export interface IWebviewOptions {
    rootPath: string;
    cwd: string;
    scripts: string[];
    /**
     * Additional paths apart from cwd and rootPath, that webview would allow loading resources/files from.
     * E.g. required for webview to serve images from worksapces when nb is in a nested folder.
     */
    additionalPaths?: string[];
    // Instead of creating a webview we may be passed on already created by VS Code
    webviewHost?: vscode.WebviewView | vscode.WebviewPanel;
}

export interface IWebviewViewOptions extends IWebviewOptions {
    listener: IWebviewViewMessageListener;
}

export const IWebviewViewProvider = Symbol('IWebviewViewProvider');
export interface IWebviewViewProvider {
    create(options: IWebviewViewOptions): Promise<IWebviewView>;
}

export interface IStatusParticipant {
    startProgress(): void;
    stopProgress(): void;
}
