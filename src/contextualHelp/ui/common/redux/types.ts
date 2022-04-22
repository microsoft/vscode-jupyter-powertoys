'use strict';

import { CssMessages, MessageType, SharedMessages, WindowMessages } from "../../../messages";
import { CommonActionType } from "./reducers/types";

// Stuff common to React and Extensions.

type BaseData = {
    messageType?: MessageType;
    /**
     * Tells us whether this message is incoming for reducer use or
     * whether this is a message that needs to be sent out to extension (from reducer).
     */
    messageDirection?: 'incoming' | 'outgoing';
};

type BaseDataWithPayload<T> = {
    messageType?: MessageType;
    /**
     * Tells us whether this message is incoming for reducer use or
     * whether this is a message that needs to be sent out to extension (from reducer).
     */
    messageDirection?: 'incoming' | 'outgoing';
    data: T;
};

// This forms the base content of every payload in all dispatchers.
export type BaseReduxActionPayload<T = never | undefined> = T extends never
    ? T extends undefined
        ? BaseData
        : BaseDataWithPayload<T>
    : BaseDataWithPayload<T>;
export type SyncPayload = {
    type: WindowMessages | SharedMessages | CommonActionType | CssMessages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: BaseReduxActionPayload<any>;
};
