// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { IWebviewView, IWebviewViewOptions, IWebviewViewProvider } from '../../types';
import { WebviewView } from './webviewView';

export class WebviewViewProvider implements IWebviewViewProvider {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async create(options: IWebviewViewOptions): Promise<IWebviewView> {
        return new WebviewView(options);
    }
}
