// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { Helpers } from '../../../common/redux/reducers/helpers';
import { ICellAction, ICellAndCursorAction } from '../../../common/redux/reducers/types';
import { IMainState } from '../../../common/types';
import { getSelectedAndFocusedInfo } from '../../../common/utils';
import { NativeEditorReducerArg } from '../mapping';

export namespace Effects {
    export function focusCell(arg: NativeEditorReducerArg<ICellAndCursorAction>): IMainState {
        // Do nothing if already the focused cell.
        let selectionInfo = getSelectedAndFocusedInfo(arg.prevState);
        if (selectionInfo.focusedCellId !== arg.payload.data.cellId) {
            let prevState = arg.prevState;

            // Ensure we unfocus & unselect all cells.
            while (selectionInfo.focusedCellId || selectionInfo.selectedCellId) {
                selectionInfo = getSelectedAndFocusedInfo(prevState);
                // First find the old focused cell and unfocus it
                let removeFocusIndex = selectionInfo.focusedCellIndex;
                if (typeof removeFocusIndex !== 'number') {
                    removeFocusIndex = selectionInfo.selectedCellIndex;
                }

                if (typeof removeFocusIndex === 'number') {
                    prevState = unfocusCell({
                        ...arg,
                        prevState,
                        payload: {
                            ...arg.payload,
                            data: { cellId: prevState.cellVMs[removeFocusIndex].cell.id }
                        }
                    });
                    prevState = deselectCell({
                        ...arg,
                        prevState,
                        payload: { ...arg.payload, data: { cellId: prevState.cellVMs[removeFocusIndex].cell.id } }
                    });
                }
            }

            const newVMs = [...prevState.cellVMs];

            // Add focus on new cell
            const addFocusIndex = newVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
            if (addFocusIndex >= 0) {
                newVMs[addFocusIndex] = {
                    ...newVMs[addFocusIndex],
                    focused: true,
                    selected: true,
                    cursorPos: arg.payload.data.cursorPos
                };
            }

            return {
                ...prevState,
                cellVMs: newVMs
            };
        }

        return arg.prevState;
    }

    export function unfocusCell(arg: NativeEditorReducerArg<ICellAction>): IMainState {
        // Unfocus the cell
        const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        const selectionInfo = getSelectedAndFocusedInfo(arg.prevState);
        if (index >= 0 && selectionInfo.focusedCellId === arg.payload.data.cellId) {
            const newVMs = [...arg.prevState.cellVMs];
            const current = arg.prevState.cellVMs[index];
            const newCell = {
                ...current,
                focused: false
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newVMs[index] = Helpers.asCellViewModel(newCell); // This is because IMessageCell doesn't fit in here

            return {
                ...arg.prevState,
                cellVMs: newVMs
            };
        } else if (index >= 0) {
            // Dont change focus state if not the focused cell. Just update the code.
            const newVMs = [...arg.prevState.cellVMs];
            const current = arg.prevState.cellVMs[index];
            const newCell = {
                ...current
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newVMs[index] = newCell as any; // This is because IMessageCell doesn't fit in here

            return {
                ...arg.prevState,
                cellVMs: newVMs
            };
        }

        return arg.prevState;
    }

    export function deselectCell(arg: NativeEditorReducerArg<ICellAction>): IMainState {
        const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        const selectionInfo = getSelectedAndFocusedInfo(arg.prevState);
        if (index >= 0 && selectionInfo.selectedCellId === arg.payload.data.cellId) {
            const newVMs = [...arg.prevState.cellVMs];
            const target = arg.prevState.cellVMs[index];
            const newCell = {
                ...target,
                selected: false
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newVMs[index] = newCell as any; // This is because IMessageCell doesn't fit in here

            return {
                ...arg.prevState,
                cellVMs: newVMs
            };
        }

        return arg.prevState;
    }

    /**
     * Select a cell.
     *
     * @param {boolean} [shouldFocusCell] If provided, then will control the focus behavior of the cell. (defaults to focus state of previously selected cell).
     */
    export function selectCell(
        arg: NativeEditorReducerArg<ICellAndCursorAction>,
        shouldFocusCell?: boolean
    ): IMainState {
        // Skip doing anything if already selected.
        const selectionInfo = getSelectedAndFocusedInfo(arg.prevState);
        if (arg.payload.data.cellId !== selectionInfo.selectedCellId) {
            let prevState = arg.prevState;
            const addIndex = prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
            const someOtherCellWasFocusedAndSelected =
                selectionInfo.focusedCellId === selectionInfo.selectedCellId && !!selectionInfo.focusedCellId;
            // First find the old focused cell and unfocus it
            let removeFocusIndex = arg.prevState.cellVMs.findIndex((c) => c.cell.id === selectionInfo.focusedCellId);
            if (removeFocusIndex < 0) {
                removeFocusIndex = arg.prevState.cellVMs.findIndex((c) => c.cell.id === selectionInfo.selectedCellId);
            }

            if (removeFocusIndex >= 0) {
                prevState = unfocusCell({
                    ...arg,
                    prevState,
                    payload: {
                        ...arg.payload,
                        data: { cellId: prevState.cellVMs[removeFocusIndex].cell.id }
                    }
                });
                prevState = deselectCell({
                    ...arg,
                    prevState,
                    payload: { ...arg.payload, data: { cellId: prevState.cellVMs[removeFocusIndex].cell.id } }
                });
            }

            const newVMs = [...prevState.cellVMs];
            if (addIndex >= 0 && arg.payload.data.cellId !== selectionInfo.selectedCellId) {
                newVMs[addIndex] = {
                    ...newVMs[addIndex],
                    focused:
                        typeof shouldFocusCell === 'boolean' ? shouldFocusCell : someOtherCellWasFocusedAndSelected,
                    selected: true,
                    cursorPos: arg.payload.data.cursorPos
                };
            }

            return {
                ...prevState,
                cellVMs: newVMs
            };
        }
        return arg.prevState;
    }

    export function toggleLineNumbers(arg: NativeEditorReducerArg<ICellAction>): IMainState {
        const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        if (index >= 0) {
            const newVMs = [...arg.prevState.cellVMs];
            newVMs[index] = { ...newVMs[index], showLineNumbers: !newVMs[index].showLineNumbers };
            return {
                ...arg.prevState,
                cellVMs: newVMs
            };
        }
        return arg.prevState;
    }

    export function toggleOutput(arg: NativeEditorReducerArg<ICellAction>): IMainState {
        const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        if (index >= 0) {
            const newVMs = [...arg.prevState.cellVMs];
            newVMs[index] = { ...newVMs[index], hideOutput: !newVMs[index].hideOutput };
            return {
                ...arg.prevState,
                cellVMs: newVMs
            };
        }
        return arg.prevState;
    }

    export function hideUI(arg: NativeEditorReducerArg<boolean>): IMainState {
        return {
            ...arg.prevState,
            hideUI: arg.payload.data
        };
    }
}
