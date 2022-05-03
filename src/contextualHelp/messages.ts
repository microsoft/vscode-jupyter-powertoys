'use strict';
import { Uri } from 'vscode';
import { ICell } from './ui/common/types';

export enum WindowMessages {
    StartCell = 'start_cell',
    FinishCell = 'finish_cell',
    UpdateCellWithExecutionResults = 'UpdateCellWithExecutionResults',
    ConvertUriForUseInWebViewRequest = 'ConvertUriForUseInWebViewRequest',
    ConvertUriForUseInWebViewResponse = 'ConvertUriForUseInWebViewResponse',
    Sync = 'sync_message_used_to_broadcast_and_sync_editors',
    OpenSettings = 'open_settings',
    GetHTMLByIdRequest = 'get_html_by_id_request',
    GetHTMLByIdResponse = 'get_html_by_id_response',
    StartProgress = 'start_progress',
    StopProgress = 'stop_progress',
    LoadAllCells = 'load_all_cells',
    LoadAllCellsComplete = 'load_all_cells_complete',
    Started = 'started',
    HideUI = 'enable'
}

export interface INotebookIdentity {
    resource: Uri;
    type: 'interactive' | 'native';
}

export interface IEditorPosition {
    /**
     * line number (starts at 1)
     */
    readonly lineNumber: number;
    /**
     * column (the first character in a line is between column 1 and column 2)
     */
    readonly column: number;
}

export interface IEditorRange {
    /**
     * Line number on which the range starts (starts at 1).
     */
    readonly startLineNumber: number;
    /**
     * Column on which the range starts in line `startLineNumber` (starts at 1).
     */
    readonly startColumn: number;
    /**
     * Line number on which the range ends.
     */
    readonly endLineNumber: number;
    /**
     * Column on which the range ends in line `endLineNumber`.
     */
    readonly endColumn: number;
}

export interface IEditorContentChange {
    /**
     * The range that got replaced.
     */
    readonly range: IEditorRange;
    /**
     * The offset of the range that got replaced.
     */
    readonly rangeOffset: number;
    /**
     * The length of the range that got replaced.
     */
    readonly rangeLength: number;
    /**
     * The new text for the range.
     */
    readonly text: string;
    /**
     * The cursor position to be set after the change
     */
    readonly position: IEditorPosition;
}

export enum SharedMessages {
    UpdateSettings = 'update_settings',
    Started = 'started',
    LocInit = 'loc_init'
}

export interface IFinishCell {
    cell: ICell;
    notebookIdentity: Uri;
}

export interface ILoadAllCells {
    cells: ICell[];
    isNotebookTrusted?: boolean;
}

export enum MessageType {
    /**
     * Action dispatched as result of some user action.
     */
    other = 0,
    /**
     * Action dispatched to re-broadcast a message across other editors of the same file in the same session.
     */
    syncAcrossSameNotebooks = 1 << 0,
    /**
     * Action dispatched to re-broadcast a message across other sessions (live share).
     */
    syncWithLiveShare = 1 << 1,
    noIdea = 1 << 2
}



// Map all messages to specific payloads
export class MessageMapping {
    public [WindowMessages.StartCell]: ICell;
    public [WindowMessages.FinishCell]: IFinishCell;
    public [WindowMessages.UpdateCellWithExecutionResults]: ICell;
    public [WindowMessages.OpenSettings]: string | undefined;
    public [SharedMessages.UpdateSettings]: string;
    public [SharedMessages.LocInit]: string;
    public [WindowMessages.ConvertUriForUseInWebViewRequest]: Uri;
    public [WindowMessages.ConvertUriForUseInWebViewResponse]: { request: Uri; response: Uri };
    public [WindowMessages.GetHTMLByIdRequest]: string;
    public [WindowMessages.GetHTMLByIdResponse]: string;
    public [WindowMessages.Started]: never | undefined;
    public [WindowMessages.StartProgress]: never | undefined;
    public [WindowMessages.StopProgress]: never | undefined;
    public [WindowMessages.LoadAllCells]: ILoadAllCells;
    public [WindowMessages.LoadAllCellsComplete]: ILoadAllCells;
    public [WindowMessages.HideUI]: boolean;
}


