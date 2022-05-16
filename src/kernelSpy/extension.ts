// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActiveKernelChildNodesProviderRegistry } from '../kernelManager/kernelChildNodeProvider';
import { commands, ExtensionContext, extensions, workspace } from 'vscode';
import { ActiveKernelMessageProvider } from './kernelMessageProvider';
import { JupyterAPI } from '../kernelManager/vscodeJupyter';

let activated = false;

export async function activate(context: ExtensionContext) {
    async function activateFeature() {
        if (activated) {
            return;
        }
        activated = true;
        const jupyterExt = extensions.getExtension<JupyterAPI>('ms-toolsai.jupyter');
        if (!jupyterExt) {
            return;
        }
        await jupyterExt.activate();
        const kernelService = await jupyterExt.exports.getKernelService();
        if (!kernelService) {
            return;
        }
        const provider = new ActiveKernelMessageProvider(kernelService);
        ActiveKernelChildNodesProviderRegistry.instance.registerProvider(provider);
        context.subscriptions.push(provider);

        commands.registerCommand('jupyter-kernelManager.inspectKernelMessages', () => {
            provider.activate();
        });
    }
    if (
        workspace.getConfiguration('jupyter').get('inspectKernelMessages.enabled') &&
        workspace.getConfiguration('jupyter').get('kernelManagement.enabled')
    ) {
        await activateFeature();
        return;
    }
    workspace.onDidChangeConfiguration(
        (e) => {
            if (
                e.affectsConfiguration('jupyter') &&
                workspace.getConfiguration('jupyter').get('inspectKernelMessages.enabled') &&
                workspace.getConfiguration('jupyter').get('kernelManagement.enabled')
            ) {
                activateFeature().catch((ex) => console.error('Failed to activate kernel management feature', ex));
            }
        },
        undefined,
        context.subscriptions
    );
}
