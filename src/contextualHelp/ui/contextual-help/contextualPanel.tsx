// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import * as React from 'react';
import { connect } from 'react-redux';
import { ContentPanel, IContentPanelProps } from '../common/contentPanel';
import { ErrorBoundary } from '../common/errorBoundary';
import { Progress } from '../common/progress';
import { IStore } from '../common/redux/store';
import { ICellViewModel, IMainState } from '../common/types';
import { getConnectedContextualCell } from './contextualCell';
import './contextualPanel.less';
import { actionCreators } from './redux/actions';

type IContextualPanelProps = IMainState & typeof actionCreators;

function mapStateToProps(state: IStore): IMainState {
    return { ...state.main };
}

const ConnectedContextualCell = getConnectedContextualCell();

export class ContextualPanel extends React.Component<IContextualPanelProps> {
    private renderCount: number = 0;
    private mainPanelToolbarRef: React.RefObject<HTMLDivElement> = React.createRef();

    public componentDidMount() {
        window.addEventListener('resize', () => this.forceUpdate(), true);
        this.props.editorLoaded();
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', () => this.forceUpdate());
        this.props.editorUnmounted();
    }

    public render() {
        // If we're hiding the UI, just render the empty string
        if (this.props.hideUI) {
            return (
                <div id="main-panel" className="native-editor-celltoolbar-middle">
                    <div className="styleSetter">
                        <style>{`${this.props.rootCss ? this.props.rootCss : ''}`}</style>
                    </div>
                    <label className="inputLabel">{'Select a notebook to get contextual help.'}</label>
                </div>
            );
        }
        const progressBar = this.props.busy || !this.props.loaded ? <Progress /> : undefined;

        return (
            <div id="main-panel" role="Main">
                <div className="styleSetter">
                    <style>{`${this.props.rootCss ? this.props.rootCss : ''}`}</style>
                </div>
                <header ref={this.mainPanelToolbarRef} id="main-panel-toolbar">
                    {progressBar}
                    {this.renderHeader()}
                </header>
                <main id="main-panel-content">{this.renderContentPanel(this.props.baseTheme)}</main>
            </div>
        );
    }

    private renderContentPanel(baseTheme: string) {
        const contentProps = this.getContentProps(baseTheme);
        return <ContentPanel {...contentProps} />;
    }

    private getContentProps = (baseTheme: string): IContentPanelProps => {
        return {
            baseTheme: baseTheme,
            cellVMs: this.props.cellVMs,
            codeTheme: this.props.codeTheme,
            submittedText: this.props.submittedText,
            skipNextScroll: this.props.skipNextScroll ? true : false,
            editable: true,
            renderCell: this.renderCell,
            scrollToBottom: this.scrollDiv,
            scrollBeyondLastLine: false
        };
    };

    private renderHeader() {
        if (this.props.currentExecutionCount > 0 && this.props.cellVMs && this.props.cellVMs.length > 0) {
            if (
                Array.isArray(this.props.cellVMs[0].cell.data.outputs) &&
                this.props.cellVMs[0].cell.data.outputs?.length > 0
            ) {
                return (
                    <div>
                        <div className="cell-header">Code under cursor: {this.props.cellVMs[0].cell.data.source}</div>
                        <hr />
                    </div>
                );
            } else {
                return (
                    <div>
                        <div className="cell-header">Code under cursor: {this.props.cellVMs[0].cell.data.source}</div>
                        <hr />
                        <div className="cell-header">No response from kernel</div>
                    </div>
                );
            }
        } else if (this.props.cellVMs && this.props.cellVMs.length > 0) {
            return (
                <div>
                    <div className="cell-header">Code under cursor: {this.props.cellVMs[0].cell.data.source}</div>
                    <hr />
                    <div className="cell-header">Kernel must be started in order to get results</div>
                </div>
            );
        }
    }

    private renderCell = (cellVM: ICellViewModel): JSX.Element | null => {
        return (
            <div key={cellVM.cell.id} id={cellVM.cell.id}>
                <ErrorBoundary>
                    <ConnectedContextualCell
                        role="listitem"
                        enableScroll={true}
                        cellVM={cellVM}
                        baseTheme={this.props.baseTheme}
                        codeTheme={this.props.codeTheme}
                        monacoTheme={this.props.monacoTheme}
                        lastCell={true}
                        firstCell={true}
                        font={this.props.font}
                        allowUndo={false}
                        language={'python'}
                    />
                </ErrorBoundary>
            </div>
        );
    };

    private scrollDiv = (_div: HTMLDivElement) => {
        // Doing nothing for now. This should be implemented once redux refactor is done.
    };
}

// Main export, return a redux connected editor
export function getConnectedContextualPanel() {
    return connect(mapStateToProps, actionCreators)(ContextualPanel);
}
