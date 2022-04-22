// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import { PostOffice } from '../../common/postOffice';
import * as ReduxCommon from '../../common/redux/store';
import { forceLoad } from '../transforms';
import { reducerMap } from './reducers';

// This special version uses the reducer map from the IInteractiveWindowMapping
export function createStore(baseTheme: string, postOffice: PostOffice) {
    return ReduxCommon.createStore(
        baseTheme,
        reducerMap,
        postOffice,
        forceLoad
    );
}
