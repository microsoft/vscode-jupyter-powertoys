// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import { MessageMapping, WindowMessages } from "../../../messages";
import { CommonActionType, CommonActionTypeMapping } from "../../common/redux/reducers/types";
import { ReducerArg, ReducerFunc } from "../../common/redux/reduxUtils";
import { BaseReduxActionPayload } from "../../common/redux/types";
import { IMainState } from "../../common/types";

type NativeEditorReducerFunc<T = never | undefined> = ReducerFunc<
    IMainState,
    CommonActionType | WindowMessages,
    BaseReduxActionPayload<T>
>;

export type NativeEditorReducerArg<T = never | undefined> = ReducerArg<
    IMainState,
    CommonActionType | WindowMessages,
    BaseReduxActionPayload<T>
>;

type NativeEditorReducerFunctions<T> = {
    [P in keyof T]: T[P] extends never | undefined ? NativeEditorReducerFunc : NativeEditorReducerFunc<T[P]>;
};

export type INativeEditorActionMapping = NativeEditorReducerFunctions<MessageMapping> &
    NativeEditorReducerFunctions<CommonActionTypeMapping>;
