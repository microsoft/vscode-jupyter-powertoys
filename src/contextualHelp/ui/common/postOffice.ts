'use strict';

import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { WebviewMessage } from '../../types';

export interface IVsCodeApi {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postMessage(msg: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(state: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getState(): any;
}

export interface IMessageHandler {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleMessage(type: string, payload?: any): boolean;
    dispose?(): void;
}

interface IMessageApi {
    register(msgCallback: (msg: WebviewMessage) => Promise<void>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessage(type: string, payload?: any): void;
    dispose(): void;
}

// This special function talks to vscode from a web panel
export declare function acquireVsCodeApi(): IVsCodeApi;
// Provides support for messaging when using the vscode webview messaging api
class VsCodeMessageApi implements IMessageApi {
    private messageCallback: ((msg: WebviewMessage) => Promise<void>) | undefined;
    private vscodeApi: IVsCodeApi | undefined;
    private registered: boolean = false;
    private baseHandler = this.handleVSCodeApiMessages.bind(this);

    public register(msgCallback: (msg: WebviewMessage) => Promise<void>) {
        this.messageCallback = msgCallback;

        // Only do this once as it crashes if we ask more than once
        // eslint-disable-next-line
        if (!this.vscodeApi && typeof acquireVsCodeApi !== 'undefined') {
            this.vscodeApi = acquireVsCodeApi(); // NOSONAR
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,
        } else if (!this.vscodeApi && typeof (window as any).acquireVsCodeApi !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.vscodeApi = (window as any).acquireVsCodeApi();
        }
        if (!this.registered) {
            this.registered = true;
            window.addEventListener('message', this.baseHandler);

            try {
                // For testing, we might use a  browser to load  the stuff.
                // In such instances the `acquireVSCodeApi` will return the event handler to get messages from extension.
                // See ./src/datascience-ui/native-editor/index.html
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const api = (this.vscodeApi as any) as undefined | { handleMessage?: Function };
                if (api && api.handleMessage) {
                    api.handleMessage(this.handleVSCodeApiMessages.bind(this));
                }
            } catch {
                // Ignore.
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public sendMessage(type: string, payload?: any) {
        if (this.vscodeApi) {
            console.log(`UI PostOffice Sent ${type}`);
            this.vscodeApi.postMessage({ type: type, payload });
        } else {
            console.log(`No vscode API to post message ${type}`);
        }
    }

    public dispose() {
        if (this.registered) {
            this.registered = false;
            window.removeEventListener('message', this.baseHandler);
        }
    }

    private async handleVSCodeApiMessages(ev: MessageEvent) {
        const msg = ev.data as WebviewMessage;
        if (msg && this.messageCallback) {
            await this.messageCallback(msg);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostOfficeMessage = { type: string; payload?: any };

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PostOffice {
    private messageApi: IMessageApi | undefined;
    private handlers: IMessageHandler[] = [];
    private readonly subject = new Subject<PostOfficeMessage>();
    private readonly observable: Observable<PostOfficeMessage>;
    constructor() {
        this.observable = this.subject.asObservable();
    }
    public asObservable(): Observable<PostOfficeMessage> {
        return this.observable;
    }
    public dispose() {
        if (this.messageApi) {
            this.messageApi.dispose();
        }
    }

    public sendMessage<M, T extends keyof M = keyof M>(type: T, payload?: M[T]) {
        return this.sendUnsafeMessage(type.toString(), payload);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public sendUnsafeMessage(type: string, payload?: any) {
        if (this.messageApi) {
            this.messageApi.sendMessage(type, payload);
        } else {
            console.log(`No message API to post message ${type}`);
        }
    }

    public addHandler(handler: IMessageHandler) {
        // Acquire here too so that the message handlers are setup during tests.
        this.acquireApi();
        this.handlers.push(handler);
    }

    public removeHandler(handler: IMessageHandler) {
        this.handlers = this.handlers.filter((f) => f !== handler);
    }

    // Hook up to our messaging API
    public acquireApi() {
        if (this.messageApi) {
            return;
        }

        this.messageApi = new VsCodeMessageApi();
        this.messageApi.register(this.handleMessage.bind(this));
    }

    private async handleMessage(msg: WebviewMessage) {
        if (this.handlers) {
            if (msg) {
                this.subject.next({ type: msg.type, payload: msg.payload });
                this.handlers.forEach((h: IMessageHandler | null) => {
                    if (h) {
                        h.handleMessage(msg.type, msg.payload);
                    }
                });
            }
        }
    }
}
