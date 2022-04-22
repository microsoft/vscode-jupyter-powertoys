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

    export function handleCss(arg: CommonReducerArg<CommonActionType, IGetCssResponse>): IMainState {
        // Recompute our known dark value from the class name in the body
        // VS code should update this dynamically when the theme changes
        const computedKnownDark = Helpers.computeKnownDark();

        // We also get this in our response, but computing is more reliable
        // than searching for it.
        const newBaseTheme =
            arg.prevState.knownDark !== computedKnownDark
                ? computedKnownDark
                    ? 'vscode-dark'
                    : 'vscode-light'
                : arg.prevState.baseTheme;

        let fontSize: number = 14;
        let fontFamily: string = "Consolas, 'Courier New', monospace";
        const sizeSetting = '--code-font-size: ';
        const familySetting = '--code-font-family: ';
        const fontSizeIndex = arg.payload.data.css.indexOf(sizeSetting);
        const fontFamilyIndex = arg.payload.data.css.indexOf(familySetting);

        if (fontSizeIndex > -1) {
            const fontSizeEndIndex = arg.payload.data.css.indexOf('px;', fontSizeIndex + sizeSetting.length);
            fontSize = parseInt(
                arg.payload.data.css.substring(fontSizeIndex + sizeSetting.length, fontSizeEndIndex),
                10
            );
        }

        if (fontFamilyIndex > -1) {
            const fontFamilyEndIndex = arg.payload.data.css.indexOf(';', fontFamilyIndex + familySetting.length);
            fontFamily = arg.payload.data.css.substring(fontFamilyIndex + familySetting.length, fontFamilyEndIndex);
        }

        return {
            ...arg.prevState,
            rootCss: arg.payload.data.css,
            font: {
                size: fontSize,
                family: fontFamily
            },
            vscodeThemeName: arg.payload.data.theme,
            knownDark: computedKnownDark,
            baseTheme: newBaseTheme
        };
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
