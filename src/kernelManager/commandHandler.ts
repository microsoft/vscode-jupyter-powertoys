// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { commands, Disposable, ExtensionContext, Uri, window, workspace } from 'vscode';
import { iPyNbNameToTemporarilyStartKernel, KernelTreeView } from './kernelTreeView';
import { IExportedKernelService, JupyterAPI } from './vscodeJupyter';
import * as path from '../vscode-path/path';
import { IActiveLocalKernelTreeNode, IActiveRemoteKernelTreeNode, IKernelSpecTreeNode } from './types';

export class CommandHandler {
    private readonly disposables: Disposable[] = [];
    constructor(
        private readonly kernelService: IExportedKernelService,
        private readonly context: ExtensionContext,
        private readonly jupyterApi: JupyterAPI
    ) {
        this.addCommandHandlers();
    }
    public dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
    public static register(kernelService: IExportedKernelService, context: ExtensionContext, jupyterApi: JupyterAPI) {
        context.subscriptions.push(new CommandHandler(kernelService, context, jupyterApi));
    }
    private addCommandHandlers() {
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.shutdownKernel', this.shutdownKernel, this)
        );
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.interruptKernel', this.interruptKernel, this)
        );
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.restartKernel', this.restartKernel, this)
        );
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.createnewinteractive', this.createInteractiveWindow, this)
        );
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.createnewnotebook', this.createNotebook, this)
        );
        this.disposables.push(
            commands.registerCommand('jupyter-kernelManager.editKernelSpec', this.editKernelSpec, this)
        );
        this.disposables.push(
            commands.registerCommand(
                'jupyter-kernelManager.refreshKernels',
                async () => {
                    await Promise.all([this.kernelService.getKernelSpecifications(true)]);
                    KernelTreeView.refresh();
                },
                this
            )
        );
    }
    private async createInteractiveWindow(
        node: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode | IKernelSpecTreeNode
    ) {
        if (node.kernelConnectionMetadata.kind === 'startUsingRemoteKernelSpec' && node.type === 'activeRemoteKernel') {
            const kernel = node.uri ? this.kernelService.getKernel(node.uri) : undefined;
            const activeKernels = await this.kernelService.getKernelSpecifications(true);
            const activeKernelSpecConnection =
                kernel &&
                activeKernels.find(
                    (item) =>
                        item.kind === 'connectToLiveRemoteKernel' &&
                        item.kernelModel.id === kernel?.connection.connection.id
                );
            if (activeKernelSpecConnection) {
                void commands.executeCommand('jupyter.createnewinteractive', activeKernelSpecConnection);
                return;
            }
        }
        void commands.executeCommand('jupyter.createnewinteractive', node.kernelConnectionMetadata);
    }
    private async createNotebook(node: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode | IKernelSpecTreeNode) {
        if (node.kernelConnectionMetadata.kind === 'startUsingRemoteKernelSpec' && node.type === 'activeRemoteKernel') {
            const kernel = node.uri ? this.kernelService.getKernel(node.uri) : undefined;
            const activeKernels = await this.kernelService.getKernelSpecifications(true);
            const activeKernelSpecConnection =
                kernel &&
                activeKernels.find(
                    (item) =>
                        item.kind === 'connectToLiveRemoteKernel' &&
                        item.kernelModel.id === kernel?.connection.connection.id
                );
            if (activeKernelSpecConnection) {
                const notebook = await commands.executeCommand('ipynb.newUntitledIpynb');
                console.log(notebook);
                return;
            }
        }
        await commands.executeCommand('ipynb.newUntitledIpynb');
        const nb = window.activeNotebookEditor?.notebook;
        if (!nb) {
            return;
        }
        this.jupyterApi.openNotebook(nb.uri, node.kernelConnectionMetadata.id);

        console.log(nb);
    }
    private async isValidConnection(a: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode) {
        // Possible the kernel has already been shutdown.
        const [kernels, activeKernels] = await Promise.all([
            this.kernelService.getKernelSpecifications(true),
            this.kernelService.getActiveKernels()
        ]);
        if (
            !activeKernels.some((item) => item.metadata.id === a.kernelConnectionMetadata.id) &&
            !kernels.some((item) => item.id === a.kernelConnectionMetadata.id)
        ) {
            KernelTreeView.refresh(a.parent);
            return false;
        }
        return true;
    }
    private async shutdownKernel(a: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode) {
        if (!(await this.isValidConnection(a))) {
            return;
        }
        const kernelConnection = await this.getKernelConnection(a);
        if (!kernelConnection) {
            return;
        }

        if (this.context.globalState.get<boolean>('dontAskShutdownKernel', false)) {
            await kernelConnection.shutdown();
            KernelTreeView.refresh(a.parent);
            return;
        }

        const result = await window.showWarningMessage(
            'Are you sure you want to shutdown the kernel?',
            { modal: true },
            'Yes',
            'Yes, do not ask again'
        );
        switch (result) {
            case 'Yes, do not ask again':
                void this.context.globalState.update('dontAskShutdownKernel', true);
            case 'Yes':
                await kernelConnection.shutdown();
                KernelTreeView.refresh(a.parent);
                break;
            default:
                break;
        }
    }
    private async restartKernel(a: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode) {
        if (!(await this.isValidConnection(a))) {
            return;
        }
        const kernelConnection = await this.getKernelConnection(a);
        if (!kernelConnection) {
            return;
        }
        if (a.uri) {
            void commands.executeCommand('jupyter.restartkernel', a.uri);
            return;
        }
        if (this.context.globalState.get<boolean>('dontAskRestartKernel', false)) {
            void kernelConnection.restart();
            return;
        }

        const result = await window.showWarningMessage(
            'Do you want to restart the Jupyter kernel?',
            { modal: true, detail: 'All variables will be lost.' },
            'Restart',
            "Yes, Don't Ask Again"
        );
        switch (result) {
            case "Yes, Don't Ask Again":
                void this.context.globalState.update('dontAskRestartKernel', true);
            case 'Restart':
                void kernelConnection.restart();
                break;
            default:
                break;
        }
    }
    private async interruptKernel(a: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode) {
        if (!(await this.isValidConnection(a))) {
            return;
        }
        const kernelConnection = await this.getKernelConnection(a);
        try {
            if (kernelConnection) {
                await kernelConnection.interrupt();
            }
        } catch (ex) {
            console.error('Failed to shutdown kernel', ex);
        } finally {
            KernelTreeView.refresh(a.parent);
        }
    }
    private async editKernelSpec(a: IKernelSpecTreeNode) {
        if (
            a.kernelConnectionMetadata.kind !== 'startUsingLocalKernelSpec' ||
            !a.kernelConnectionMetadata.kernelSpec.specFile
        ) {
            return;
        }
        const document = await workspace.openTextDocument(a.kernelConnectionMetadata.kernelSpec.specFile);
        void window.showTextDocument(document);
    }
    private async getKernelConnection(a: IActiveRemoteKernelTreeNode | IActiveLocalKernelTreeNode) {
        if (!(await this.isValidConnection(a))) {
            return;
        }
        if (!a.connection?.connection) {
            // Check if we already have an active connection for this.
            // If this is a remote kernel and we have already connected to this, then we can just shutdown that kernel.
            if (a.kernelConnectionMetadata.kind === 'startUsingRemoteKernelSpec' && a.uri) {
                const kernel = this.kernelService.getKernel(a.uri);
                if (kernel) {
                    return kernel.connection.connection;
                }
                KernelTreeView.refresh(a.parent);
                return;
            }
            try {
                // Connect to the remote kernel.
                const workspaceFolder = workspace.workspaceFolders?.length
                    ? workspace.workspaceFolders[0].uri
                    : this.context.extensionUri;
                const filePath = path.join(
                    workspaceFolder.fsPath,
                    a.kernelConnectionMetadata.id,
                    iPyNbNameToTemporarilyStartKernel
                );
                const kernel = await this.kernelService.startKernel(a.kernelConnectionMetadata, Uri.file(filePath));
                return kernel.connection;
            } catch (ex) {
                console.error('Failed to shutdown kernel', ex);
            }
            KernelTreeView.refresh(a.parent);
        }
        return a.connection?.connection;
    }
}
