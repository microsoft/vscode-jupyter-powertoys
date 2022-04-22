// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import { MessageMapping, WindowMessages } from "../../../messages";
import { CommonActionTypeMapping, CommonAction, CommonActionType, ICellAndCursorAction, ICellAction, IEditCellAction, ILinkClickAction, ICodeCreatedAction, IOpenSettingsAction } from "../../common/redux/reducers/types";
import { CursorPos } from "../../common/types";


// This function isn't made common and not exported, to ensure it isn't used elsewhere.
function createIncomingActionWithPayload<
    M extends MessageMapping & CommonActionTypeMapping,
    K extends keyof M
>(type: K, data: M[K]): CommonAction<M[K]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { type, payload: { data, messageDirection: 'incoming' } as any } as any;
}
// This function isn't made common and not exported, to ensure it isn't used elsewhere.
function createIncomingAction(type: CommonActionType | WindowMessages): CommonAction {
    return { type, payload: { messageDirection: 'incoming', data: undefined } };
}

// See https://react-redux.js.org/using-react-redux/connect-mapdispatch#defining-mapdispatchtoprops-as-an-object
export const actionCreators = {
    executeCell: (cellId: string, code: string, moveOp: 'add' | 'select' | 'none') =>
        createIncomingActionWithPayload(CommonActionType.EXECUTE_CELL_AND_ADVANCE, { cellId, code, moveOp }),
    focusCell: (cellId: string, cursorPos: CursorPos = CursorPos.Current): CommonAction<ICellAndCursorAction> =>
        createIncomingActionWithPayload(CommonActionType.FOCUS_CELL, { cellId, cursorPos }),
    unfocusCell: (cellId: string, code: string) =>
        createIncomingActionWithPayload(CommonActionType.UNFOCUS_CELL, { cellId, code }),
    copyCellCode: (cellId: string): CommonAction<ICellAction> =>
        createIncomingActionWithPayload(CommonActionType.COPY_CELL_CODE, { cellId }),
    selectCell: (cellId: string, cursorPos: CursorPos = CursorPos.Current): CommonAction<ICellAndCursorAction> =>
        createIncomingActionWithPayload(CommonActionType.SELECT_CELL, { cellId, cursorPos }),
    restartKernel: (): CommonAction => createIncomingAction(CommonActionType.RESTART_KERNEL),
    interruptKernel: (): CommonAction => createIncomingAction(CommonActionType.INTERRUPT_KERNEL),
    export: (): CommonAction => createIncomingAction(CommonActionType.EXPORT),
    exportAs: (): CommonAction => createIncomingAction(CommonActionType.EXPORT_NOTEBOOK_AS),
    save: (): CommonAction => createIncomingAction(CommonActionType.SAVE),
    changeCellType: (cellId: string) => createIncomingActionWithPayload(CommonActionType.CHANGE_CELL_TYPE, { cellId }),
    toggleLineNumbers: (cellId: string): CommonAction<ICellAction> =>
        createIncomingActionWithPayload(CommonActionType.TOGGLE_LINE_NUMBERS, { cellId }),
    toggleOutput: (cellId: string): CommonAction<ICellAction> =>
        createIncomingActionWithPayload(CommonActionType.TOGGLE_OUTPUT, { cellId }),
    editorLoaded: (): CommonAction => createIncomingAction(CommonActionType.EDITOR_LOADED),
    codeCreated: (cellId: string | undefined, modelId: string): CommonAction<ICodeCreatedAction> =>
        createIncomingActionWithPayload(CommonActionType.CODE_CREATED, { cellId, modelId }),
    loadedAllCells: (): CommonAction => createIncomingAction(CommonActionType.LOADED_ALL_CELLS),
    editorUnmounted: (): CommonAction => createIncomingAction(CommonActionType.UNMOUNT),
    launchNotebookTrustPrompt: (): CommonAction => createIncomingAction(CommonActionType.LAUNCH_NOTEBOOK_TRUST_PROMPT),
};
