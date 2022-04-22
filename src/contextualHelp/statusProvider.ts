'use strict';
import * as vscode from 'vscode';
import { createDeferred, Deferred } from './common/async';
import { IStatusParticipant } from './types';

class StatusItem implements vscode.Disposable {
    private deferred: Deferred<void>;
    private disposed: boolean = false;
    private timeout: NodeJS.Timer | number | undefined;
    private disposeCallback: () => void;

    constructor(_title: string, disposeCallback: () => void, timeout?: number) {
        this.deferred = createDeferred<void>();
        this.disposeCallback = disposeCallback;

        // A timeout is possible too. Auto dispose if that's the case
        if (timeout) {
            this.timeout = setTimeout(this.dispose, timeout);
        }
    }

    public dispose = () => {
        if (!this.disposed) {
            this.disposed = true;
            if (this.timeout) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                clearTimeout(this.timeout as any);
                this.timeout = undefined;
            }
            this.disposeCallback();
            if (!this.deferred.completed) {
                this.deferred.resolve();
            }
        }
    };

    public promise = (): Promise<void> => {
        return this.deferred.promise;
    };

    public reject = () => {
        this.deferred.reject();
        this.dispose();
    };
}

export class StatusProvider {
    private statusCount: number = 0;

    constructor() {}

    public set(
        message: string,
        showInWebView: boolean,
        timeout?: number,
        cancel?: () => void,
        participant?: IStatusParticipant
    ): vscode.Disposable {
        // Start our progress
        this.incrementCount(showInWebView, participant);

        // Create a StatusItem that will return our promise
        const statusItem = new StatusItem(message, () => this.decrementCount(participant), timeout);

        const progressOptions: vscode.ProgressOptions = {
            location: cancel ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
            title: message,
            cancellable: cancel !== undefined
        };

        // Set our application shell status with a busy icon
        vscode.window.withProgress(progressOptions, (_p, c) => {
            if (c && cancel) {
                c.onCancellationRequested(() => {
                    cancel();
                    statusItem.reject();
                });
            }
            return statusItem.promise();
        });

        return statusItem;
    }

    public async waitWithStatus<T>(
        promise: () => Promise<T>,
        message: string,
        showInWebView: boolean,
        timeout?: number,
        cancel?: () => void,
        panel?: IStatusParticipant
    ): Promise<T> {
        // Create a status item and wait for our promise to either finish or reject
        const status = this.set(message, showInWebView, timeout, cancel, panel);
        let result: T;
        try {
            result = await promise();
        } finally {
            status.dispose();
        }
        return result;
    }

    private incrementCount = (showInWebView: boolean, panel?: IStatusParticipant) => {
        if (this.statusCount === 0) {
            if (panel && showInWebView) {
                panel.startProgress();
            }
        }
        this.statusCount += 1;
    };

    private decrementCount = (panel?: IStatusParticipant) => {
        const updatedCount = this.statusCount - 1;
        if (updatedCount === 0) {
            if (panel) {
                panel.stopProgress();
            }
        }
        this.statusCount = Math.max(updatedCount, 0);
    };
}
