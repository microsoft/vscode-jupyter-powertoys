// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { min } from 'lodash';
import { ICellViewModel, IMainState, CellState, ICell } from '../../types';
import { arePathsSame } from '../../utils';
import { detectBaseTheme } from '../themeDetector';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const cloneDeep = require('lodash/cloneDeep');

import { CommonActionType, CommonReducerArg } from './types';

const StackLimit = 10;

export namespace Helpers {
    export function computeKnownDark(): boolean {
        const baseTheme = detectBaseTheme();
        return baseTheme !== 'vscode-light';
    }

    export function pushStack(stack: ICellViewModel[][], cells: ICellViewModel[]) {
        // Get the undo stack up to the maximum length
        const slicedUndo = stack.slice(0, min([stack.length, StackLimit]));

        // make a copy of the cells so that further changes don't modify them.
        const copy = cloneDeep(cells);
        return [...slicedUndo, copy];
    }

    export function firstCodeCellAbove(state: IMainState, cellId: string | undefined) {
        const codeCells = state.cellVMs.filter((c) => c.cell.data.cell_type === 'code');
        const index = codeCells.findIndex((c) => c.cell.id === cellId);
        if (index > 0) {
            return codeCells[index - 1].cell.id;
        }
        return undefined;
    }

    // This function is because the unit test typescript compiler can't handle ICell.metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function asCellViewModel(cvm: any): ICellViewModel {
        return cvm as ICellViewModel;
    }

    // This function is because the unit test typescript compiler can't handle ICell.metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function asCell(cell: any): ICell {
        return cell as ICell;
    }

    export function updateOrAdd(
        arg: CommonReducerArg<CommonActionType, ICell>,
        generateVM: (cell: ICell, mainState: IMainState) => ICellViewModel
    ): IMainState {
        // First compute new execution count.
        const newExecutionCount = arg.payload.data.data.execution_count
            ? Math.max(
                  arg.prevState.currentExecutionCount,
                  parseInt(arg.payload.data.data.execution_count.toString(), 10)
              )
            : arg.prevState.currentExecutionCount;

        const index = arg.prevState.cellVMs.findIndex((c: ICellViewModel) => {
            return (
                c.cell.id === arg.payload.data.id &&
                c.cell.line === arg.payload.data.line &&
                arePathsSame(c.cell.file, arg.payload.data.file)
            );
        });
        if (index >= 0) {
            // This means the cell existed already so it was actual executed code.
            // Use its execution count to update our execution count.
            const finished =
                arg.payload.data.state === CellState.finished || arg.payload.data.state === CellState.error;

            // Have to make a copy of the cell VM array or
            // we won't actually update.
            const newVMs = [...arg.prevState.cellVMs];

            const newVM: ICellViewModel = {
                ...newVMs[index],
                cell: {
                    ...newVMs[index].cell,
                    state: arg.payload.data.state,
                    data: {
                        ...arg.payload.data.data
                    }
                }
            };
            newVMs[index] = newVM;

            return {
                ...arg.prevState,
                cellVMs: newVMs,
                currentExecutionCount: newExecutionCount
            };
        } else {
            // This is an entirely new cell (it may have started out as finished)
            const newVM = generateVM(arg.payload.data, arg.prevState);
            const newVMs = [...arg.prevState.cellVMs, newVM];
            return {
                ...arg.prevState,
                cellVMs: newVMs,
                undoStack: pushStack(arg.prevState.undoStack, arg.prevState.cellVMs),
                currentExecutionCount: newExecutionCount
            };
        }
    }
}
