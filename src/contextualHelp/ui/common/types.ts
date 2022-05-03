
import type * as nbformat from '@jupyterlab/nbformat';
import { IEditorPosition } from '../../messages';

export enum CellState {
    editing = -1,
    init = 0,
    executing = 1,
    finished = 2,
    error = 3
}


// Basic structure for a cell from a notebook
export interface ICell {
    id: string; // This value isn't unique. File and line are needed too.
    file: string;
    line: number;
    state: CellState;
    data: nbformat.ICodeCell | nbformat.IRawCell | nbformat.IMarkdownCell;
    extraLines?: number[];
}

export interface ICellViewModel {
    cell: ICell;
    inputBlockShow: boolean;
    inputBlockOpen: boolean;
    inputBlockText: string;
    inputBlockCollapseNeeded: boolean;
    editable: boolean;
    directInput?: boolean;
    showLineNumbers?: boolean;
    hideOutput?: boolean;
    useQuickEdit?: boolean;
    selected: boolean;
    focused: boolean;
    scrollCount: number;
    cursorPos: CursorPos | IEditorPosition;
}

export enum CursorPos {
    Top,
    Bottom,
    Current
}

export type SelectionAndFocusedInfo = {
    selectedCellId?: string;
    selectedCellIndex?: number;
    focusedCellId?: string;
    focusedCellIndex?: number;
};

export type IMainState = {
    cellVMs: ICellViewModel[];
    busy: boolean;
    skipNextScroll?: boolean;
    undoStack: ICellViewModel[][];
    redoStack: ICellViewModel[][];
    submittedText: boolean;
    rootStyle?: string;
    rootCss?: string;
    vscodeThemeName?: string;
    baseTheme: string;
    monacoTheme?: string;
    knownDark: boolean;
    currentExecutionCount: number;
    debugging: boolean;
    dirty: boolean;
    isAtBottom: boolean;
    newCellId?: string;
    loadTotal?: number;
    codeTheme: string;
    focusPending: number;
    loaded: boolean;
    isNotebookTrusted: boolean;
    hideUI: boolean;
};
