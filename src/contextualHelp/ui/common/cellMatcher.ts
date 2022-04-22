// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { splitLines } from './strings';

export class CellMatcher {
    public codeExecRegEx: RegExp;
    public markdownExecRegEx: RegExp;

    private codeMatchRegEx: RegExp;
    private markdownMatchRegEx: RegExp;
    private defaultCellMarker: string;
    private defaultCellMarkerExec: RegExp;

    constructor() {
        this.codeMatchRegEx = this.createRegExp(
            undefined,
            /^(#\s*%%|#\s*\<codecell\>|#\s*In\[\d*?\]|#\s*In\[ \])/
        );
        this.markdownMatchRegEx = this.createRegExp(
            undefined,
            /^(#\s*%%\s*\[markdown\]|#\s*\<markdowncell\>)/
        );
        this.codeExecRegEx = new RegExp(`${this.codeMatchRegEx.source}(.*)`);
        this.markdownExecRegEx = new RegExp(`${this.markdownMatchRegEx.source}(.*)`);
        this.defaultCellMarker = '# %%';
        this.defaultCellMarkerExec = this.createRegExp(`${this.defaultCellMarker}(.*)`, /# %%(.*)/);
    }

    public isCell(code: string): boolean {
        return this.isCode(code) || this.isMarkdown(code);
    }

    public isMarkdown(code: string): boolean {
        return this.markdownMatchRegEx.test(code);
    }

    public isCode(code: string): boolean {
        return this.codeMatchRegEx.test(code) || code.trim() === this.defaultCellMarker;
    }

    public getCellType(code: string): string {
        return this.isMarkdown(code) ? 'markdown' : 'code';
    }

    public stripFirstMarker(code: string): string {
        const lines = splitLines(code, { trim: false, removeEmptyEntries: false });

        // Only strip this off the first line. Otherwise we want the markers in the code.
        if (lines.length > 0 && (this.isCode(lines[0]) || this.isMarkdown(lines[0]))) {
            return lines.slice(1).join('\n');
        }
        return code;
    }

    public exec(code: string): string | undefined {
        let result: RegExpExecArray | null = null;
        if (this.defaultCellMarkerExec.test(code)) {
            this.defaultCellMarkerExec.lastIndex = -1;
            result = this.defaultCellMarkerExec.exec(code);
        } else if (this.codeMatchRegEx.test(code)) {
            this.codeExecRegEx.lastIndex = -1;
            result = this.codeExecRegEx.exec(code);
        } else if (this.markdownMatchRegEx.test(code)) {
            this.markdownExecRegEx.lastIndex = -1;
            result = this.markdownExecRegEx.exec(code);
        }
        if (result) {
            return result.length > 1 ? result[result.length - 1].trim() : '';
        }
        return undefined;
    }

    private createRegExp(potential: string | undefined, backup: RegExp): RegExp {
        try {
            if (potential) {
                return new RegExp(potential);
            }
        } catch {
            // Do nothing
        }

        return backup;
    }
}
