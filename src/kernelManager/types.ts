// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Uri } from 'vscode';
import {
    IKernelConnectionInfo,
    KernelConnectionMetadata,
    LiveRemoteKernelConnectionMetadata,
    LocalKernelSpecConnectionMetadata,
    PythonKernelConnectionMetadata,
    RemoteKernelSpecConnectionMetadata
} from './vscodeJupyter';

export type Node =
    | IServerTreeNode
    | IKernelSpecRootTreeNode
    | IKernelSpecTreeNode
    | ILanguageTreeNode
    | IActiveKernelRootTreeNode
    | IActiveLocalKernelTreeNode
    | IActiveRemoteKernelTreeNode
    | IPythonEnvironmentCategoryTreeNode
    | ICustomNodeFromAnotherProvider;
export interface IServerTreeNode {
    type: 'host';
    baseUrl?: string;
}

export interface ILanguageTreeNode {
    type: 'language';
    baseUrl?: string;
    language: string;
}
export interface IPythonEnvironmentCategoryTreeNode {
    type: 'pythonEnvCategory';
    category: string;
}

export interface IKernelSpecRootTreeNode {
    type: 'kernelSpecRoot';
    baseUrl?: string;
}
export interface IActiveKernelRootTreeNode {
    type: 'activeKernelRoot';
    baseUrl: string;
}
export interface IKernelSpecTreeNode {
    type: 'kernelSpec';
    kernelConnectionMetadata: KernelConnectionMetadata;
}
export interface IActiveLocalKernelTreeNode {
    type: 'activeLocalKernel';
    kernelConnectionMetadata: LocalKernelSpecConnectionMetadata | PythonKernelConnectionMetadata;
    uri: Uri;
    connection: IKernelConnectionInfo;
    parent: Node;
}
export interface IActiveRemoteKernelTreeNode {
    type: 'activeRemoteKernel';
    kernelConnectionMetadata: LiveRemoteKernelConnectionMetadata | RemoteKernelSpecConnectionMetadata;
    uri?: Uri;
    connection?: IKernelConnectionInfo;
    parent: Node;
}
export interface ICustomNodeFromAnotherProvider {
    type: 'customNodeFromAnotherProvider';
    providerId: string;
}
