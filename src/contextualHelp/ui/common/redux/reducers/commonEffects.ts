'use strict';
import { IGetCssResponse, WindowMessages } from '../../../../messages';
import { IMainState } from '../../types';
import { postActionToExtension } from '../helpers';
import { Helpers } from './helpers';
import {
    CommonActionType,
    CommonReducerArg,
} from './types';

export namespace CommonEffects {
    export function notebookDirty(arg: CommonReducerArg): IMainState {
        return {
            ...arg.prevState,
            dirty: true
        };
    }

    export function notebookClean(arg: CommonReducerArg): IMainState {
        return {
            ...arg.prevState,
            dirty: false
        };
    }

    export function trustNotebook(arg: CommonReducerArg): IMainState {
        return {
            ...arg.prevState,
            isNotebookTrusted: true
        };
    }

    export function startProgress(arg: CommonReducerArg): IMainState {
        return {
            ...arg.prevState,
            busy: true
        };
    }

    export function stopProgress(arg: CommonReducerArg): IMainState {
        return {
            ...arg.prevState,
            busy: false
        };
    }

    export function activate(arg: CommonReducerArg): IMainState {
        return focusPending(arg.prevState);
    }

    export function focusInput(arg: CommonReducerArg): IMainState {
        return focusPending(arg.prevState);
    }


    export function focusPending(prevState: IMainState): IMainState {
        return {
            ...prevState,
            // This is only applicable for interactive window & not native editor.
            focusPending: prevState.focusPending + 1
        };
    }

    // Extension has requested HTML for the webview, get it by ID and send it back as a message
    export function getHTMLByIdRequest(arg: CommonReducerArg<CommonActionType, string>): IMainState {
        const element = document.getElementById(arg.payload.data);

        if (element) {
            postActionToExtension(arg, WindowMessages.GetHTMLByIdResponse, element.innerHTML);
        }
        return arg.prevState;
    }
}
