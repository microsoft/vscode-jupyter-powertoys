// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { WindowMessages } from '../../../../messages';
import { CommonEffects } from '../../../common/redux/reducers/commonEffects';
import { Transfer } from '../../../common/redux/reducers/transfer';
import { CommonActionType } from '../../../common/redux/reducers/types';
import { INativeEditorActionMapping } from '../mapping';
import { Creation } from './creation';
import { Effects } from './effects';

// The list of reducers. 1 per message/action.
export const reducerMap: Partial<INativeEditorActionMapping> = {
    // State updates
    [CommonActionType.INSERT_ABOVE_AND_FOCUS_NEW_CELL]: Creation.insertAboveAndFocusCell,
    [CommonActionType.INSERT_ABOVE_FIRST_AND_FOCUS_NEW_CELL]: Creation.insertAboveFirstAndFocusCell,
    [CommonActionType.INSERT_BELOW_AND_FOCUS_NEW_CELL]: Creation.insertBelowAndFocusCell,
    [CommonActionType.INSERT_ABOVE]: Creation.insertNewAbove,
    [CommonActionType.INSERT_ABOVE_FIRST]: Creation.insertAboveFirst,
    [CommonActionType.INSERT_BELOW]: Creation.insertBelow,
    [CommonActionType.FOCUS_CELL]: Effects.focusCell,
    [CommonActionType.UNFOCUS_CELL]: Effects.unfocusCell,
    [CommonActionType.ADD_AND_FOCUS_NEW_CELL]: Creation.addAndFocusCell,
    [CommonActionType.ADD_NEW_CELL]: Creation.addNewCell,
    [CommonActionType.SELECT_CELL]: Effects.selectCell,
    [CommonActionType.DELETE_CELL]: Creation.deleteCell,
    [CommonActionType.TOGGLE_LINE_NUMBERS]: Effects.toggleLineNumbers,
    [CommonActionType.TOGGLE_OUTPUT]: Effects.toggleOutput,
    [CommonActionType.UNMOUNT]: Creation.unmount,
    [CommonActionType.EDITOR_LOADED]: Transfer.started,

    // Messages from the webview (some are ignored)
    [WindowMessages.StartCell]: Creation.startCell,
    [WindowMessages.FinishCell]: Creation.finishCell,
    [WindowMessages.UpdateCellWithExecutionResults]: Creation.updateCell,
    [WindowMessages.LoadAllCells]: Creation.loadAllCells,
    [WindowMessages.StartProgress]: CommonEffects.startProgress,
    [WindowMessages.StopProgress]: CommonEffects.stopProgress,
    [WindowMessages.HideUI]: Effects.hideUI
};
