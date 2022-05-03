// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { WindowMessages } from '../../../../messages';
import { IMainState } from '../../types';
import { postActionToExtension } from '../helpers';
import {
    CommonReducerArg} from './types';

// These are all reducers that don't actually change state. They merely dispatch a message to the other side.
export namespace Transfer {

    export function started(arg: CommonReducerArg): IMainState {
        // Send all of our initial requests
        postActionToExtension(arg, WindowMessages.Started);
        return arg.prevState;
    }

    export function loadedAllCells(arg: CommonReducerArg): IMainState {
        postActionToExtension(arg, WindowMessages.LoadAllCellsComplete, {
            cells: arg.prevState.cellVMs.map((c) => c.cell)
        });
        return arg.prevState;
    }
}
