// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Event, TreeItem } from 'vscode';
import { IActiveLocalKernelTreeNode, IActiveRemoteKernelTreeNode, ICustomNodeFromAnotherProvider } from './types';

export interface IActiveKernelChildNodesProvider {
    id: string;
    onDidChangeTreeData?: Event<void | ICustomNodeFromAnotherProvider | null | undefined>;
    getChildren(
        node: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode | ICustomNodeFromAnotherProvider
    ): ICustomNodeFromAnotherProvider[];
    getTreeItem(node: ICustomNodeFromAnotherProvider): TreeItem;
}

export class ActiveKernelChildNodesProviderRegistry {
    static instance = new ActiveKernelChildNodesProviderRegistry();
    public readonly registeredProviders = new Map<string, IActiveKernelChildNodesProvider>();
    public registerProvider(provider: IActiveKernelChildNodesProvider): void {
        ActiveKernelChildNodesProviderRegistry.instance.registeredProviders.set(provider.id, provider);
    }
}
