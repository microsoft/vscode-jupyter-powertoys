// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import type * as nbformat from '@jupyterlab/nbformat';
import * as ansiRegex from 'ansi-regex';
import * as fastDeepEqual from 'fast-deep-equal';
import { noop } from 'lodash';
import * as React from 'react';
import { concatMultilineString } from '../common';
import { fixMarkdown } from '../common/markdownManipulation';
import { CellState, ICellViewModel } from '../common/types';
import { getRichestMimetype, getTransform, isMimeTypeSupported } from './transforms';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const ansiToHtml = require('ansi-to-html');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const lodashEscape = require('lodash/escape');

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const cloneDeep = require('lodash/cloneDeep');

interface ICellOutputProps {
    cellVM: ICellViewModel;
    baseTheme: string;
    maxTextSize?: number;
    enableScroll?: boolean;
    hideOutput?: boolean;
    themeMatplotlibPlots?: boolean;
}

interface ICellOutputData {
    mimeType: string;
    data: nbformat.MultilineString | any;
    mimeBundle: nbformat.IMimeBundle;
    renderWithScrollbars: boolean;
    isText: boolean;
    isError: boolean;
}

interface ICellOutput {
    output: ICellOutputData;
    extraButton: JSX.Element | null; // Extra button for plot viewing is stored here
    outputSpanClassName?: string; // Wrap this output in a span with the following className, undefined to not wrap
    doubleClick(): void; // Double click handler for plot viewing is stored here
}
/* eslint-disable  */
export class CellOutput extends React.Component<ICellOutputProps> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static get ansiToHtmlClass(): React.ClassType<any, any, any> {
        if (!CellOutput.ansiToHtmlClass_ctor) {
            // ansiToHtml is different between the tests running and webpack. figure out which one
            if (ansiToHtml instanceof Function) {
                CellOutput.ansiToHtmlClass_ctor = ansiToHtml;
            } else {
                CellOutput.ansiToHtmlClass_ctor = ansiToHtml.default;
            }
        }
        return CellOutput.ansiToHtmlClass_ctor!;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static ansiToHtmlClass_ctor: React.ClassType<any, any, any> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(prop: ICellOutputProps) {
        super(prop);
    }
    private static getAnsiToHtmlOptions(): { fg: string; bg: string; colors: string[] } {
        // Here's the default colors for ansiToHtml. We need to use the
        // colors from our current theme.
        // const colors = {
        //     0: '#000',
        //     1: '#A00',
        //     2: '#0A0',
        //     3: '#A50',
        //     4: '#00A',
        //     5: '#A0A',
        //     6: '#0AA',
        //     7: '#AAA',
        //     8: '#555',
        //     9: '#F55',
        //     10: '#5F5',
        //     11: '#FF5',
        //     12: '#55F',
        //     13: '#F5F',
        //     14: '#5FF',
        //     15: '#FFF'
        // };
        return {
            fg: 'var(--vscode-terminal-foreground)',
            bg: 'var(--vscode-terminal-background)',
            colors: [
                'var(--vscode-terminal-ansiBlack)', // 0
                'var(--vscode-terminal-ansiBrightRed)', // 1
                'var(--vscode-terminal-ansiGreen)', // 2
                'var(--vscode-terminal-ansiYellow)', // 3
                'var(--vscode-terminal-ansiBrightBlue)', // 4
                'var(--vscode-terminal-ansiMagenta)', // 5
                'var(--vscode-terminal-ansiCyan)', // 6
                'var(--vscode-terminal-ansiBrightBlack)', // 7
                'var(--vscode-terminal-ansiWhite)', // 8
                'var(--vscode-terminal-ansiRed)', // 9
                'var(--vscode-terminal-ansiBrightGreen)', // 10
                'var(--vscode-terminal-ansiBrightYellow)', // 11
                'var(--vscode-terminal-ansiBlue)', // 12
                'var(--vscode-terminal-ansiBrightMagenta)', // 13
                'var(--vscode-terminal-ansiBrightCyan)', // 14
                'var(--vscode-terminal-ansiBrightWhite)' // 15
            ]
        };
    }
    public render() {
        // Only render results if not an edit cell
        const outputClassNames = this.isCodeCell()
            ? `cell-output cell-output-${this.props.baseTheme}`
            : 'markdown-cell-output-container';

        return <div className={outputClassNames}>{this.renderResults()}</div>;
    }
    public componentWillUnmount() {}
    public componentDidMount() {
        if (!this.isCodeCell() || !this.hasOutput() || !this.getCodeCell().outputs || this.props.hideOutput) {
            return;
        }
    }
    // eslint-disable-next-line
    public componentDidUpdate(prevProps: ICellOutputProps) {
        if (!this.isCodeCell() || !this.hasOutput() || !this.getCodeCell().outputs || this.props.hideOutput) {
            return;
        }
        if (fastDeepEqual(this.props, prevProps)) {
            return;
        }
        // Check if outupt has changed.
        if (
            prevProps.cellVM.cell.data.cell_type === 'code' &&
            prevProps.cellVM.cell.state === this.getCell()!.state &&
            prevProps.hideOutput === this.props.hideOutput &&
            fastDeepEqual(this.props.cellVM.cell.data, prevProps.cellVM.cell.data)
        ) {
            return;
        }
    }

    public shouldComponentUpdate(
        nextProps: Readonly<ICellOutputProps>,
        _nextState: Readonly<ICellOutputProps>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _nextContext: any
    ): boolean {
        if (nextProps === this.props) {
            return false;
        }
        if (nextProps.baseTheme !== this.props.baseTheme) {
            return true;
        }
        if (nextProps.maxTextSize !== this.props.maxTextSize) {
            return true;
        }
        if (nextProps.themeMatplotlibPlots !== this.props.themeMatplotlibPlots) {
            return true;
        }
        // If they are the same, then nothing has changed.
        // Note, we're using redux, hence we'll never have the same reference object with different property values.
        if (nextProps.cellVM === this.props.cellVM) {
            return false;
        }
        if (nextProps.cellVM.cell.data.cell_type !== this.props.cellVM.cell.data.cell_type) {
            return true;
        }
        if (nextProps.cellVM.cell.state !== this.props.cellVM.cell.state) {
            return true;
        }
        if (nextProps.cellVM.cell.data.outputs !== this.props.cellVM.cell.data.outputs) {
            return true;
        }
        if (!this.isCodeCell() && nextProps.cellVM.cell.data.source !== this.props.cellVM.cell.data.source) {
            return true;
        }

        return false;
    }
    // Public for testing
    public getUnknownMimeTypeFormatString() {
        return 'Unknown Mime Type';
    }

    private getCell = () => {
        return this.props.cellVM.cell;
    };

    private isCodeCell = () => {
        return this.props.cellVM.cell.data.cell_type === 'code';
    };

    private hasOutput = () => {
        return (
            this.getCell().state === CellState.finished ||
            this.getCell().state === CellState.error ||
            this.getCell().state === CellState.executing
        );
    };

    private getCodeCell = () => {
        return this.props.cellVM.cell.data as nbformat.ICodeCell;
    };

    private getMarkdownCell = () => {
        return this.props.cellVM.cell.data as nbformat.IMarkdownCell;
    };

    private renderResults = (): JSX.Element[] => {
        // Results depend upon the type of cell
        if (this.isCodeCell()) {
            return (
                this.renderCodeOutputs()
                    .filter((item) => !!item)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((item) => item as any as JSX.Element)
            );
        } else {
            return this.renderMarkdownOutputs();
        }
    };

    private renderCodeOutputs = () => {
        // return [];
        if (this.isCodeCell() && this.hasOutput() && this.getCodeCell().outputs && !this.props.hideOutput) {
            const trim = this.props.cellVM.cell.data.metadata.tags ? this.props.cellVM.cell.data.metadata.tags[0] : '';
            // Render the outputs
            const outputs = this.renderOutputs(this.getCodeCell().outputs, trim);
            return outputs;
        }
        return [];
    };

    private renderMarkdownOutputs = () => {
        const markdown = this.getMarkdownCell();
        // React-markdown expects that the source is a string
        const source = fixMarkdown(concatMultilineString(markdown.source));
        const Transform = getTransform('text/markdown');
        const MarkdownClassName = 'markdown-cell-output';

        return [
            <div key={0} className={MarkdownClassName}>
                <Transform key={0} data={source} />
            </div>
        ];
    };

    private computeOutputData(output: nbformat.IOutput): ICellOutputData {
        let isText = false;
        let isError = false;
        let mimeType = 'text/plain';
        let input = output.data;
        let renderWithScrollbars = false;

        // Special case for json. Just turn into a string
        if (input && input.hasOwnProperty('application/json')) {
            input = JSON.stringify(output.data);
            renderWithScrollbars = true;
            isText = true;
        } else if (output.output_type === 'stream') {
            mimeType = 'text/html';
            isText = true;
            isError = false;
            renderWithScrollbars = true;
            // Sonar is wrong, TS won't compile without this AS
            const stream = output as nbformat.IStream; // NOSONAR
            const concatted = lodashEscape(concatMultilineString(stream.text));
            input = {
                'text/html': concatted
            };

            // Output may have ascii colorization chars in it.
            try {
                if (ansiRegex.default().test(concatted)) {
                    const converter = new CellOutput.ansiToHtmlClass(CellOutput.getAnsiToHtmlOptions());
                    const html = converter.toHtml(concatted);
                    input = {
                        'text/html': html
                    };
                }
            } catch {
                // Do nothing
            }
        } else if (output.output_type === 'error') {
            mimeType = 'text/html';
            isText = true;
            isError = true;
            renderWithScrollbars = true;
            // Sonar is wrong, TS won't compile without this AS
            const error = output as nbformat.IError; // NOSONAR
            try {
                const converter = new CellOutput.ansiToHtmlClass(CellOutput.getAnsiToHtmlOptions());
                // Modified traceback may exist. If so use that instead. It's only at run time though
                const traceback: string[] = error.transient
                    ? (error.transient as string[])
                    : error.traceback.map(lodashEscape);
                const trace = traceback ? converter.toHtml(traceback.join('\n')) : error.evalue;
                input = {
                    'text/html': trace
                };
            } catch {
                // This can fail during unit tests, just use the raw data
                input = {
                    'text/html': lodashEscape(error.evalue)
                };
            }
        } else if (input) {
            // Compute the mime type
            mimeType = getRichestMimetype(input);
            isText = mimeType === 'text/plain';
        }

        // Then parse the mime type
        const mimeBundle = input as nbformat.IMimeBundle; // NOSONAR
        let data: nbformat.MultilineString | any = mimeBundle[mimeType];

        // For un-executed output we might get text or svg output as multiline string arrays
        // we want to concat those so we don't display a bunch of weird commas as we expect
        // Single strings in our output
        if (Array.isArray(data)) {
            data = concatMultilineString(data as nbformat.MultilineString, true);
        }

        // Fixup latex to make sure it has the requisite $$ around it
        if (mimeType === 'text/latex') {
            data = fixMarkdown(concatMultilineString(data as nbformat.MultilineString, true), true);
        }

        return {
            isText,
            isError,
            renderWithScrollbars,
            data: data,
            mimeType,
            mimeBundle
        };
    }

    private transformOutput(output: nbformat.IOutput): ICellOutput {
        // First make a copy of the outputs.
        const copy = cloneDeep(output);

        // Then compute the data
        const data = this.computeOutputData(copy);
        let extraButton: JSX.Element | null = null;

        // Then parse the mime type
        try {
            // Text based mimeTypes don't get a white background
            if (/^text\//.test(data.mimeType)) {
                return {
                    output: data,
                    extraButton,
                    doubleClick: noop
                };
            } else if (data.mimeType === 'image/svg+xml' || data.mimeType === 'image/png') {
                // return the image
                // If not theming plots then wrap in a span
                return {
                    output: data,
                    extraButton,
                    doubleClick: noop,
                    outputSpanClassName: this.props.themeMatplotlibPlots ? undefined : 'cell-output-plot-background'
                };
            } else {
                // For anything else just return it with a white plot background. This lets stuff like vega look good in
                // dark mode
                return {
                    output: data,
                    extraButton,
                    doubleClick: noop,
                    outputSpanClassName: this.props.themeMatplotlibPlots ? undefined : 'cell-output-plot-background'
                };
            }
        } catch (e) {
            return {
                output: {
                    data: (e as any).toString(),
                    isText: true,
                    isError: false,
                    renderWithScrollbars: false,
                    mimeType: 'text/plain',
                    mimeBundle: {}
                },
                extraButton: null,
                doubleClick: noop
            };
        }
    }

    // eslint-disable-next-line
    private renderOutputs(outputs: nbformat.IOutput[], trim: string): JSX.Element[] {
        return [this.renderOutput(outputs, trim)];
    }

    private renderOutput = (outputs: nbformat.IOutput[], trim: string): JSX.Element => {
        const buffer: JSX.Element[] = [];
        const transformedList = outputs.map(this.transformOutput.bind(this));

        transformedList.forEach((transformed, index) => {
            const mimeType = transformed.output.mimeType;
            if (mimeType && isMimeTypeSupported(mimeType)) {
                // If that worked, use the transform
                // Get the matching React.Component for that mimetype
                const Transform = getTransform(mimeType);

                let className = transformed.output.isText ? 'cell-output-text' : 'cell-output-html';
                className = transformed.output.isError ? `${className} cell-output-error` : className;

                // If we are not theming plots then wrap them in a white span
                if (transformed.outputSpanClassName) {
                    buffer.push(
                        <div role="group" key={index} onDoubleClick={transformed.doubleClick} className={className}>
                            <span className={transformed.outputSpanClassName}>
                                {transformed.extraButton}
                                <Transform data={transformed.output.data} />
                            </span>
                        </div>
                    );
                } else {
                    if (trim === 'outputPrepend') {
                        buffer.push(
                            <div role="group" key={index} onDoubleClick={transformed.doubleClick} className={className}>
                                {transformed.extraButton}
                                <Transform data={transformed.output.data} />
                            </div>
                        );
                    } else {
                        buffer.push(
                            <div role="group" key={index} onDoubleClick={transformed.doubleClick} className={className}>
                                {transformed.extraButton}
                                <Transform data={transformed.output.data} />
                            </div>
                        );
                    }
                }
            } else if (
                !mimeType ||
                mimeType.startsWith('application/scrapbook.scrap.') ||
                mimeType.startsWith('application/aml')
            ) {
                // Silently skip rendering of these mime types, render an empty div so the user sees the cell was executed.
                buffer.push(<div key={index}></div>);
            } else {
                const str: string = `Unknown mimeType: ${mimeType}`;
                buffer.push(<div key={index}>{str}</div>);
            }
        });

        // Create a default set of properties
        const style: React.CSSProperties = {};

        // Create a scrollbar style if necessary
        if (transformedList.some((transformed) => transformed.output.renderWithScrollbars) && this.props.enableScroll) {
            style.overflowY = 'auto';
            style.maxHeight = `${this.props.maxTextSize}px`;
        }

        return (
            <div key={0} style={style}>
                {buffer}
            </div>
        );
    };
}
