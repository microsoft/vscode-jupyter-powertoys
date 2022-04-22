// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

// This must be on top, do not change. Required by webpack.
import '../common/main';
// This must be on top, do not change. Required by webpack.

import '../common/index.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { getConnectedContextualPanel } from './contextualPanel';
import { createStore } from './redux/store';
import { IVsCodeApi, PostOffice } from '../common/postOffice';
import { detectBaseTheme } from '../common/redux/themeDetector';

// This special function talks to vscode from a web panel
export declare function acquireVsCodeApi(): IVsCodeApi;
const baseTheme = detectBaseTheme();

// Create the redux store
const postOffice = new PostOffice();
const store = createStore(baseTheme, postOffice);

// Wire up a connected react control for our ScratchEditor
const ConnectedContextualPanel = getConnectedContextualPanel();

// Stick them all together
/* eslint-disable  */
ReactDOM.render(
    <Provider store={store}>
        <ConnectedContextualPanel />
    </Provider>,
    document.getElementById('root') as HTMLElement
);
