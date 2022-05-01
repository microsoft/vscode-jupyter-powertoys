import * as path from 'path';

const folderName = path.basename(__dirname);
export const EXTENSION_ROOT_DIR = folderName;
export const NotebookCellScheme = 'vscode-notebook-cell';


export namespace Constants {
    export const OpenScratchPadInteractive = 'jupyter.notebookeditor.openInInteractive';
    export const OpenContextualHelp = 'jupyter.notebookeditor.openContextualHelp';
}

export namespace Identifiers {
    export const EmptyFileName = '2DB9B899-6519-4E1B-88B0-FA728A274115';
    export const HistoryPurpose = 'history';
    export const RawPurpose = 'raw';
    export const PingPurpose = 'ping';
    export const MatplotLibDefaultParams = '_VSCode_defaultMatplotlib_Params';
    export const EditCellId = '3D3AB152-ADC1-4501-B813-4B83B49B0C10';
    export const SvgSizeTag = 'sizeTag={{0}, {1}}';
    export const InteractiveWindowIdentityScheme = 'history';
    export const DefaultCodeCellMarker = '# %%';
    export const DefaultCommTarget = 'jupyter.widget';
    export const ALL_VARIABLES = 'ALL_VARIABLES';
    export const KERNEL_VARIABLES = 'KERNEL_VARIABLES';
    export const DEBUGGER_VARIABLES = 'DEBUGGER_VARIABLES';
    export const MULTIPLEXING_DEBUGSERVICE = 'MULTIPLEXING_DEBUGSERVICE';
    export const RUN_BY_LINE_DEBUGSERVICE = 'RUN_BY_LINE_DEBUGSERVICE';
    export const REMOTE_URI = 'https://remote/';
    export const REMOTE_URI_ID_PARAM = 'id';
    export const REMOTE_URI_HANDLE_PARAM = 'uriHandle';
}

export namespace RegExpValues {
    export const PythonCellMarker = /^(#\s*%%|#\s*\<codecell\>|#\s*In\[\d*?\]|#\s*In\[ \])/;
    export const PythonMarkdownCellMarker = /^(#\s*%%\s*\[markdown\]|#\s*\<markdowncell\>)/;
    export const PyKernelOutputRegEx = /.*\s+(.+)$/m;
    export const KernelSpecOutputRegEx = /^\s*(\S+)\s+(\S+)$/;
    // This next one has to be a string because uglifyJS isn't handling the groups. We use named-js-regexp to parse it
    // instead.
    export const UrlPatternRegEx =
        '(?<PREFIX>https?:\\/\\/)((\\(.+\\s+or\\s+(?<IP>.+)\\))|(?<LOCAL>[^\\s]+))(?<REST>:.+)';
    export interface IUrlPatternGroupType {
        LOCAL: string | undefined;
        PREFIX: string | undefined;
        REST: string | undefined;
        IP: string | undefined;
    }
    export const HttpPattern = /https?:\/\//;
    export const ExtractPortRegex = /https?:\/\/[^\s]+:(\d+)[^\s]+/;
    export const ConvertToRemoteUri = /(https?:\/\/)([^\s])+(:\d+[^\s]*)/;
    export const ParamsExractorRegEx = /\S+\((.*)\)\s*{/;
    export const ArgsSplitterRegEx = /([^\s,]+)/;
    export const ShapeSplitterRegEx = /.*,\s*(\d+).*/;
    export const SvgHeightRegex = /(\<svg.*height=\")(.*?)\"/;
    export const SvgWidthRegex = /(\<svg.*width=\")(.*?)\"/;
    export const SvgSizeTagRegex = /\<svg.*tag=\"sizeTag=\{(.*),\s*(.*)\}\"/;
    export const StyleTagRegex = /\<style[\s\S]*\<\/style\>/m;
}
