// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import { IFinishCell, IEditorContentChange, ILoadAllCells } from '../../../../messages';
import { splitMultilineString } from '../../../common';
import { queueIncomingActionWithPayload } from '../../../common/redux/helpers';
import { Helpers } from '../../../common/redux/reducers/helpers';
import { IAddCellAction, CommonActionType, ICellAction } from '../../../common/redux/reducers/types';
import { CursorPos, ICell, ICellViewModel, IMainState } from '../../../common/types';
import { createCellVM, createEmptyCell, extractInputText, getSelectedAndFocusedInfo } from '../../../common/utils';
import { NativeEditorReducerArg } from '../mapping';
import { Effects } from './effects';

export namespace Creation {
    function prepareCellVM(cell: ICell): ICellViewModel {
        const cellVM: ICellViewModel = createCellVM(cell);

        // Set initial cell visibility and collapse
        cellVM.editable = true;

        // Always have the cell input text open
        const newText = extractInputText(cellVM);

        cellVM.inputBlockOpen = true;
        cell.data.source = splitMultilineString(newText);

        return cellVM;
    }

    export function addAndFocusCell(arg: NativeEditorReducerArg<IAddCellAction>): IMainState {
        queueIncomingActionWithPayload(arg, CommonActionType.ADD_NEW_CELL, { newCellId: arg.payload.data.newCellId });
        queueIncomingActionWithPayload(arg, CommonActionType.FOCUS_CELL, {
            cellId: arg.payload.data.newCellId,
            cursorPos: CursorPos.Current
        });
        return arg.prevState;
    }

    export function insertAboveAndFocusCell(arg: NativeEditorReducerArg<IAddCellAction & ICellAction>): IMainState {
        queueIncomingActionWithPayload(arg, CommonActionType.INSERT_ABOVE, {
            cellId: arg.payload.data.cellId,
            newCellId: arg.payload.data.newCellId
        });
        queueIncomingActionWithPayload(arg, CommonActionType.SELECT_CELL, {
            cellId: arg.payload.data.newCellId,
            cursorPos: CursorPos.Current
        });
        return arg.prevState;
    }

    export function insertBelowAndFocusCell(arg: NativeEditorReducerArg<IAddCellAction & ICellAction>): IMainState {
        queueIncomingActionWithPayload(arg, CommonActionType.INSERT_BELOW, {
            cellId: arg.payload.data.cellId,
            newCellId: arg.payload.data.newCellId
        });
        queueIncomingActionWithPayload(arg, CommonActionType.SELECT_CELL, {
            cellId: arg.payload.data.newCellId,
            cursorPos: CursorPos.Current
        });
        return arg.prevState;
    }

    export function insertAboveFirstAndFocusCell(arg: NativeEditorReducerArg<IAddCellAction>): IMainState {
        queueIncomingActionWithPayload(arg, CommonActionType.INSERT_ABOVE_FIRST, {
            newCellId: arg.payload.data.newCellId
        });
        queueIncomingActionWithPayload(arg, CommonActionType.FOCUS_CELL, {
            cellId: arg.payload.data.newCellId,
            cursorPos: CursorPos.Current
        });
        return arg.prevState;
    }

    function insertAbove(arg: NativeEditorReducerArg<ICellAction & { vm: ICellViewModel }>): IMainState {
        const newList = [...arg.prevState.cellVMs];
        const newVM = arg.payload.data.vm;

        // Find the position where we want to insert
        let position = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        if (position >= 0) {
            newList.splice(position, 0, newVM);
        } else {
            newList.splice(0, 0, newVM);
            position = 0;
        }

        const result = {
            ...arg.prevState,
            undoStack: Helpers.pushStack(arg.prevState.undoStack, arg.prevState.cellVMs),
            cellVMs: newList
        };

        return result;
    }

    export function insertExistingAbove(arg: NativeEditorReducerArg<ICellAction & { cell: ICell }>): IMainState {
        const newVM = prepareCellVM(arg.payload.data.cell);
        return insertAbove({
            ...arg,
            payload: {
                ...arg.payload,
                data: {
                    cellId: arg.payload.data.cellId,
                    vm: newVM
                }
            }
        });
    }

    export function insertNewAbove(arg: NativeEditorReducerArg<ICellAction & IAddCellAction>): IMainState {
        const newVM = prepareCellVM(createEmptyCell(arg.payload.data.newCellId, null));
        return insertAbove({
            ...arg,
            payload: {
                ...arg.payload,
                data: {
                    cellId: arg.payload.data.cellId,
                    vm: newVM
                }
            }
        });
    }

    export function insertBelow(arg: NativeEditorReducerArg<ICellAction & IAddCellAction>): IMainState {
        return insertExistingBelow({
            ...arg,
            payload: {
                ...arg.payload,
                data: { ...arg.payload.data, cell: createEmptyCell(arg.payload.data.newCellId, null) }
            }
        });
    }

    export function insertExistingBelow(
        arg: NativeEditorReducerArg<ICellAction & IAddCellAction & { cell: ICell }>
    ): IMainState {
        const newVM = prepareCellVM(arg.payload.data.cell);
        const newList = [...arg.prevState.cellVMs];

        // Find the position where we want to insert
        let position = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
        if (position >= 0) {
            position += 1;
            newList.splice(position, 0, newVM);
        } else {
            newList.push(newVM);
            position = newList.length;
        }

        const result = {
            ...arg.prevState,
            undoStack: Helpers.pushStack(arg.prevState.undoStack, arg.prevState.cellVMs),
            cellVMs: newList
        };

        return result;
    }

    export function insertAboveFirst(arg: NativeEditorReducerArg<IAddCellAction>): IMainState {
        // Get the first cell id
        const firstCellId = arg.prevState.cellVMs.length > 0 ? arg.prevState.cellVMs[0].cell.id : undefined;

        // Do what an insertAbove does
        return insertNewAbove({
            ...arg,
            payload: { ...arg.payload, data: { cellId: firstCellId, newCellId: arg.payload.data.newCellId } }
        });
    }

    export function addNewCell(arg: NativeEditorReducerArg<IAddCellAction>): IMainState {
        // Do the same thing that an insertBelow does using the currently selected cell.
        return insertBelow({
            ...arg,
            payload: {
                ...arg.payload,
                data: {
                    cellId: getSelectedAndFocusedInfo(arg.prevState).selectedCellId,
                    newCellId: arg.payload.data.newCellId
                }
            }
        });
    }

    export function startCell(arg: NativeEditorReducerArg<ICell>): IMainState {
        return Helpers.updateOrAdd(arg, (c: ICell, s: IMainState) => prepareCellVM(c));
    }

    export function updateCell(arg: NativeEditorReducerArg<ICell>): IMainState {
        return Helpers.updateOrAdd(arg, (c: ICell, s: IMainState) => prepareCellVM(c));
    }

    export function finishCell(arg: NativeEditorReducerArg<IFinishCell>): IMainState {
        return Helpers.updateOrAdd(
            { ...arg, payload: { ...arg.payload, data: arg.payload.data.cell } },
            (c: ICell, s: IMainState) => prepareCellVM(c)
        );
    }

    export function deleteAllCells(arg: NativeEditorReducerArg<IAddCellAction>): IMainState {
        // Just leave one single blank empty cell
        const newVM: ICellViewModel = {
            cell: createEmptyCell(arg.payload.data.newCellId, null),
            editable: true,
            inputBlockOpen: true,
            inputBlockShow: true,
            inputBlockText: '',
            inputBlockCollapseNeeded: false,
            selected: false,
            focused: false,
            cursorPos: CursorPos.Current,
            scrollCount: 0,
        };

        return {
            ...arg.prevState,
            cellVMs: [newVM],
            undoStack: Helpers.pushStack(arg.prevState.undoStack, arg.prevState.cellVMs)
        };
    }

    export function applyCellEdit(
        arg: NativeEditorReducerArg<{ id: string; changes: IEditorContentChange[] }>
    ): IMainState {
        const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.id);
        if (index >= 0) {
            const newVM = { ...arg.prevState.cellVMs[index] };
            arg.payload.data.changes.forEach((c) => {
                const source = newVM.inputBlockText;
                const before = source.slice(0, c.rangeOffset);
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                const after = source.slice(c.rangeOffset + c.rangeLength);
                newVM.inputBlockText = `${before}${c.text}${after}`;
            });
            newVM.cell.data.source = splitMultilineString(newVM.inputBlockText);
            newVM.cursorPos = arg.payload.data.changes[0].position;
            const newVMs = [...arg.prevState.cellVMs];
            newVMs[index] = Helpers.asCellViewModel(newVM);
            // When editing, make sure we focus the edited cell (otherwise undo looks weird because it undoes a non focused cell)
            return Effects.focusCell({
                ...arg,
                prevState: { ...arg.prevState, cellVMs: newVMs },
                payload: { ...arg.payload, data: { cursorPos: CursorPos.Current, cellId: arg.payload.data.id } }
            });
        }
        return arg.prevState;
    }

    export function deleteCell(arg: NativeEditorReducerArg<ICellAction>): IMainState {
        const cells = arg.prevState.cellVMs;
        if (cells.length === 1 && cells[0].cell.id === arg.payload.data.cellId) {
            // Special case, if this is the last cell, don't delete it, just clear it's output and input
            const newVM: ICellViewModel = {
                cell: createEmptyCell(arg.payload.data.cellId, null),
                editable: true,
                inputBlockOpen: true,
                inputBlockShow: true,
                inputBlockText: '',
                inputBlockCollapseNeeded: false,
                selected: cells[0].selected,
                focused: cells[0].focused,
                cursorPos: CursorPos.Current,
                scrollCount: 0,
            };

            return {
                ...arg.prevState,
                undoStack: Helpers.pushStack(arg.prevState.undoStack, arg.prevState.cellVMs),
                cellVMs: [newVM]
            };
        } else if (arg.payload.data.cellId) {
            // Otherwise just a straight delete
            const index = arg.prevState.cellVMs.findIndex((c) => c.cell.id === arg.payload.data.cellId);
            if (index >= 0) {
                // Recompute select/focus if this item has either
                const previousSelection = getSelectedAndFocusedInfo(arg.prevState);
                const newVMs = [...arg.prevState.cellVMs.filter((c) => c.cell.id !== arg.payload.data.cellId)];
                const nextOrPrev = index === arg.prevState.cellVMs.length - 1 ? index - 1 : index;
                if (
                    previousSelection.selectedCellId === arg.payload.data.cellId ||
                    previousSelection.focusedCellId === arg.payload.data.cellId
                ) {
                    if (nextOrPrev >= 0) {
                        newVMs[nextOrPrev] = {
                            ...newVMs[nextOrPrev],
                            selected: true,
                            focused: previousSelection.focusedCellId === arg.payload.data.cellId
                        };
                    }
                }

                return {
                    ...arg.prevState,
                    cellVMs: newVMs,
                    undoStack: Helpers.pushStack(arg.prevState.undoStack, arg.prevState.cellVMs),
                    skipNextScroll: true
                };
            }
        }

        return arg.prevState;
    }

    export function loadAllCells(arg: NativeEditorReducerArg<ILoadAllCells>): IMainState {
        const vms = arg.payload.data.cells.map((c) => prepareCellVM(c));
        return {
            ...arg.prevState,
            busy: false,
            loadTotal: arg.payload.data.cells.length,
            undoStack: [],
            cellVMs: vms,
            loaded: true,
            isNotebookTrusted: arg.payload.data.isNotebookTrusted!
        };
    }

    export function unmount(arg: NativeEditorReducerArg): IMainState {
        return {
            ...arg.prevState,
            cellVMs: [],
            undoStack: [],
            redoStack: []
        };
    }

}
