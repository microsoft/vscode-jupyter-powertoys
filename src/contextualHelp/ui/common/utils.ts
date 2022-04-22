import { cloneDeep } from "lodash";
import { concatMultilineString, splitMultilineString } from ".";
import { createCodeCell } from "./cellFactory";
import { CellMatcher } from "./cellMatcher";
import { CellState, CursorPos, ICell, ICellViewModel, SelectionAndFocusedInfo } from "./types";

export function arePathsSame(path1: string, path2: string): boolean {
    // Just normalize on upper case. Doesn't matter much
    return path1.toUpperCase() === path2.toUpperCase();
}

export function extractInputText(inputCellVM: ICellViewModel): string {
    const inputCell = inputCellVM.cell;
    let source: string[] = [];
    if (inputCell.data.source) {
        source = splitMultilineString(cloneDeep(inputCell.data.source));
    }
    const matcher = new CellMatcher();

    // Eliminate the #%% on the front if it has nothing else on the line
    if (source.length > 0) {
        const title = matcher.exec(source[0].trim());
        if (title !== undefined && title.length <= 0) {
            source.splice(0, 1);
        }
        // Eliminate the lines to hide if we're debugging
        if (inputCell.extraLines) {
            inputCell.extraLines.forEach((i) => source.splice(i, 1));
            inputCell.extraLines = undefined;
        }
    }

    return concatMultilineString(source);
}


export function createCellVM(
    inputCell: ICell,
): ICellViewModel {
    const vm : ICellViewModel = {
        cell: inputCell,
        editable: false,
        inputBlockOpen: true,
        inputBlockShow: true,
        inputBlockText: '',
        inputBlockCollapseNeeded: false,
        selected: false,
        focused: false,
        scrollCount: 0,
        cursorPos: CursorPos.Top
    };

    // Update the input text
    let inputLinesCount = 0;
    // If the cell is markdown, initialize inputBlockText with the mardown value.
    // `inputBlockText` will be used to maintain diffs of editor changes. So whether its markdown or code, we need to generate it.
    const inputText =
        inputCell.data.cell_type === 'code'
            ? extractInputText(vm)
            : inputCell.data.cell_type === 'markdown'
            ? concatMultilineString(vm.cell.data.source)
            : '';
    if (inputText) {
        inputLinesCount = inputText.split('\n').length;
    }

    vm.inputBlockText = inputText;
    vm.inputBlockCollapseNeeded = inputLinesCount > 1;

    return vm;
}

export function createEmptyCell(id: string, executionCount: number | null): ICell {
    const emptyCodeCell = createCodeCell();
    emptyCodeCell.execution_count = executionCount ?? null;
    return {
        data: emptyCodeCell,
        id: id,
        file: 'empty.py',
        line: 0,
        state: CellState.finished
    };
}

export function getSelectedAndFocusedInfo(state: { cellVMs: ICellViewModel[] }): SelectionAndFocusedInfo {
    const info: {
        selectedCellId?: string;
        selectedCellIndex?: number;
        focusedCellId?: string;
        focusedCellIndex?: number;
    } = {};
    for (let index = 0; index < state.cellVMs.length; index += 1) {
        const cell = state.cellVMs[index];
        if (cell.selected) {
            info.selectedCellId = cell.cell.id;
            info.selectedCellIndex = index;
        }
        if (cell.focused) {
            info.focusedCellId = cell.cell.id;
            info.focusedCellIndex = index;
        }
        if (info.selectedCellId && info.focusedCellId) {
            break;
        }
    }

    return info;
}