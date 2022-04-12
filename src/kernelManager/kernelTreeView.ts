// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from 'path';
import { ConnectionStatus, IKernelConnection, Status } from '@jupyterlab/services/lib/kernel/kernel';
import {
    commands,
    Disposable,
    EventEmitter,
    languages,
    NotebookDocument,
    ThemeIcon,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    window
} from 'vscode';
import {
    EnvironmentType,
    IExportedKernelService,
    IKernelConnectionInfo,
    KernelConnectionMetadata,
    LiveRemoteKernelConnectionMetadata,
    LocalKernelSpecConnectionMetadata,
    PythonKernelConnectionMetadata,
    RemoteKernelSpecConnectionMetadata
} from './vscodeJupyter';
import { getDisplayPath, getLanguageExtension } from './utils';
import { PYTHON_LANGUAGE } from './constants';
import { getPythonEnvironmentCategory } from './integration';

export const ipynbNameToTemporarilyStartKernel = '__dummy__.ipynb';
type Node =
    | IServerTreeNode
    | IKernelSpecRootTreeNode
    | IKernelSpecTreeNode
    | ILanguageTreeNode
    | IActiveKernelRootTreeNode
    | IActiveLocalKernelTreeNode
    | IActiveRemoteKernelTreeNode
    | IPythonEnvironmentCategoryTreeNode;
interface IServerTreeNode {
    type: 'host';
    baseUrl?: string;
}

interface ILanguageTreeNode {
    type: 'language';
    baseUrl?: string;
    language: string;
}
interface IPythonEnvironmentCategoryTreeNode {
    type: 'pythonEnvCategory';
    category: string;
}

interface IKernelSpecRootTreeNode {
    type: 'kernelSpecRoot';
    baseUrl?: string;
}
interface IActiveKernelRootTreeNode {
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

function getConnectionTitle(baseUrl?: string) {
    return baseUrl ? `Remote Kernels (${baseUrl})` : 'Local Connections';
}
class HostTreeItem extends TreeItem {
    constructor(public readonly data: IServerTreeNode) {
        super(getConnectionTitle(data.baseUrl), TreeItemCollapsibleState.Collapsed);
        this.contextValue = this.data.type;
    }
}
class LanguageTreeItem extends TreeItem {
    constructor(public readonly data: ILanguageTreeNode) {
        super(data.language, TreeItemCollapsibleState.Collapsed);
        this.contextValue = `kernelspec-language:${data}`;
        const ext = getLanguageExtension(data.language);
        this.resourceUri = ext ? Uri.parse(`one${ext}`) : undefined;
        this.iconPath = new ThemeIcon('file');
    }
}
class PythonEnvironmentTreeItem extends TreeItem {
    constructor(public readonly data: IPythonEnvironmentCategoryTreeNode) {
        super(data.category, TreeItemCollapsibleState.Collapsed);
        // this.contextValue = `kernelspec-language:${data}`;
        // const ext = getLanguageExtension(data.language);
        // this.resourceUri = ext ? Uri.parse(`one${ext}`) : undefined;
        // this.iconPath = new ThemeIcon('file');
    }
}
class KernelSpecifications extends TreeItem {
    constructor(public readonly data: IKernelSpecRootTreeNode) {
        super('Kernel Specifications', TreeItemCollapsibleState.Collapsed);
        this.contextValue = this.data.type;
    }
}
class ActiveKernels extends TreeItem {
    constructor(public readonly data: IActiveKernelRootTreeNode) {
        super('Active Jupyter Sessions', TreeItemCollapsibleState.Collapsed);
        this.contextValue = this.data.type;
    }
}

function getOldFormatDisplayNameOrNameOfKernelConnection(kernelConnection: KernelConnectionMetadata | undefined) {
    if (!kernelConnection) {
        return '';
    }
    const displayName =
        kernelConnection.kind === 'connectToLiveKernel'
            ? kernelConnection.kernelModel.display_name
            : kernelConnection.kernelSpec?.display_name;
    const name =
        kernelConnection.kind === 'connectToLiveKernel'
            ? kernelConnection.kernelModel.name
            : kernelConnection.kernelSpec?.name;

    const interpreterName =
        kernelConnection.kind === 'startUsingPythonInterpreter' ? kernelConnection.interpreter.displayName : undefined;

    return displayName || name || interpreterName || '';
}

export function getTelemetrySafeVersion(version: string): string | undefined {
    try {
        // Split by `.` & take only the first 3 numbers.
        // Suffix with '.', so we know we'll always have 3 items in the array.
        const [major, minor, patch] = `${version.trim()}...`.split('.').map((item) => parseInt(item, 10));
        if (isNaN(major)) {
            return;
        } else if (isNaN(minor)) {
            return major.toString();
        } else if (isNaN(patch)) {
            return `${major}.${minor}`;
        }
        return `${major}.${minor}.${patch}`;
    } catch (ex) {
        console.error(`Failed to parse version ${version}`, ex);
    }
}
export function getDisplayNameOrNameOfKernelConnection(kernelConnection: KernelConnectionMetadata | undefined) {
    const oldDisplayName = getOldFormatDisplayNameOrNameOfKernelConnection(kernelConnection);
    if (!kernelConnection) {
        return oldDisplayName;
    }
    switch (kernelConnection.kind) {
        case 'connectToLiveKernel': {
            const notebookPath = removeNotebookSuffixAddedByExtension(
                kernelConnection.kernelModel?.notebook?.path || kernelConnection.kernelModel?.model?.path || ''
            );
            return notebookPath ? `${oldDisplayName} (${notebookPath})` : oldDisplayName;
        }
        case 'startUsingRemoteKernelSpec':
        case 'startUsingLocalKernelSpec': {
            if (
                kernelConnection.interpreter?.envType &&
                kernelConnection.interpreter.envType !== EnvironmentType.Global
            ) {
                if (kernelConnection.kernelSpec.language === PYTHON_LANGUAGE) {
                    const pythonVersion = `Python ${
                        getTelemetrySafeVersion(kernelConnection.interpreter.version?.raw || '') || ''
                    }`.trim();
                    return kernelConnection.interpreter.envName
                        ? `${oldDisplayName} (${pythonVersion})`
                        : oldDisplayName;
                } else {
                    // Non-Python kernelspec that launches via python interpreter
                    return kernelConnection.interpreter.envName
                        ? `${oldDisplayName} (${kernelConnection.interpreter.envName})`
                        : oldDisplayName;
                }
            } else {
                return oldDisplayName;
            }
        }
        case 'startUsingPythonInterpreter':
            if (
                kernelConnection.interpreter.envType &&
                kernelConnection.interpreter.envType !== EnvironmentType.Global
            ) {
                if (
                    kernelConnection.kind === 'startUsingPythonInterpreter' &&
                    kernelConnection.interpreter.envType === EnvironmentType.Conda
                ) {
                    const envName =
                        kernelConnection.interpreter.envName ||
                        (kernelConnection.interpreter.envPath
                            ? path.basename(kernelConnection.interpreter.envPath)
                            : '');
                    if (envName) {
                        const version = kernelConnection.interpreter.version
                            ? ` (Python ${kernelConnection.interpreter.version.raw})`
                            : '';
                        return `${envName}${version}`;
                    }
                }

                const pythonVersion = kernelConnection.interpreter.version?.raw
                    ? `Python ${getTelemetrySafeVersion(kernelConnection.interpreter.version?.raw || '') || ''}`.trim()
                    : '';
                const pythonDisplayName = pythonVersion.trim();
                return kernelConnection.interpreter.envName
                    ? `${kernelConnection.interpreter.envName} ${pythonDisplayName ? `(${pythonDisplayName})` : ''}`
                    : pythonDisplayName;
            }
    }
    return oldDisplayName;
}
const jvscIdentifier = '-jvsc-';

/**
 * When creating remote sessions, we generate bogus names for the notebook.
 * These names are prefixed with the same local file name, and a random suffix.
 * However the random part does contain an identifier, and we can stip this off
 * to get the original local ipynb file name.
 */
export function removeNotebookSuffixAddedByExtension(notebookPath: string) {
    if (notebookPath.includes(jvscIdentifier)) {
        const guidRegEx = /[a-f0-9]$/;
        if (
            notebookPath
                .substring(notebookPath.lastIndexOf(jvscIdentifier) + jvscIdentifier.length)
                .search(guidRegEx) !== -1
        ) {
            return `${notebookPath.substring(0, notebookPath.lastIndexOf(jvscIdentifier))}.ipynb`;
        }
    }
    return notebookPath;
}
function getKernelConnectionLanguage(connection: KernelConnectionMetadata) {
    switch (connection.kind) {
        case 'connectToLiveKernel': {
            return connection.kernelModel.language;
        }
        case 'startUsingLocalKernelSpec':
        case 'startUsingRemoteKernelSpec': {
            return connection.kernelSpec.language;
        }
        case 'startUsingPythonInterpreter': {
            return connection.kernelSpec.language || 'python';
        }
        default:
            return;
    }
}
class KernelSpecTreeItem extends TreeItem {
    constructor(public readonly data: IKernelSpecTreeNode) {
        super(getDisplayNameOrNameOfKernelConnection(data.kernelConnectionMetadata), TreeItemCollapsibleState.None);
        switch (data.kernelConnectionMetadata.kind) {
            case 'startUsingLocalKernelSpec':
                this.description = data.kernelConnectionMetadata.kernelSpec.specFile
                    ? getDisplayPath(data.kernelConnectionMetadata.kernelSpec.specFile)
                    : '';
                break;
            case 'startUsingPythonInterpreter':
                this.description = getDisplayPath(data.kernelConnectionMetadata.interpreter.path);
                break;
            default:
                break;
        }
        this.contextValue = `${this.data.type}:${this.data.kernelConnectionMetadata.kind}`;
        const ext = getLanguageExtension(getKernelConnectionLanguage(data.kernelConnectionMetadata));
        this.resourceUri = ext ? Uri.parse(`one${ext}`) : undefined;
        this.tooltip = this.label ? (typeof this.label === 'string' ? this.label : this.label.label || '') : '';
        this.iconPath = new ThemeIcon('file');
    }
}
class ActiveLocalOrRemoteKernelConnectionTreeItem extends TreeItem {
    constructor(public readonly data: IActiveLocalKernelTreeNode | IActiveRemoteKernelTreeNode) {
        super(getDisplayNameOrNameOfKernelConnection(data.kernelConnectionMetadata), TreeItemCollapsibleState.None);
        if (data.uri && !data.uri.fsPath.endsWith(ipynbNameToTemporarilyStartKernel)) {
            this.description = path.basename(data.uri.fsPath);
        }
        const ext = getLanguageExtension(getKernelConnectionLanguage(data.kernelConnectionMetadata));
        this.resourceUri = ext ? Uri.parse(`one${ext}`) : undefined;
        this.iconPath = new ThemeIcon('file');
        const prefix = data.type === 'activeLocalKernel' ? 'local' : 'remote';
        this.contextValue = `${prefix}:activeKernel:${this.data.connection?.connection.status || 'dead'}`;
        console.log(this.contextValue);
        const tooltips: string[] = [];
        if (this.data.connection?.connection.status) {
            tooltips.push(`Status ${this.data.connection?.connection.status}`);
        }
        if (this.data.connection?.connection.connectionStatus) {
            tooltips.push(`Connection ${this.data.connection?.connection.connectionStatus}`);
        }
        this.tooltip = tooltips.length ? tooltips.join(', ') : undefined;
        if (this.data.connection) {
            if (this.data.connection.connection.connectionStatus !== 'connected') {
                this.updateIcon(this.data.connection.connection.connectionStatus);
            } else {
                this.updateIcon(this.data.connection.connection.status);
            }
        }
    }
    private updateIcon(state: 'disconnected' | 'connecting' | Status) {
        switch (state) {
            case 'dead':
            case 'disconnected':
            case 'terminating':
                // dead icon.
                this.iconPath = new ThemeIcon('error');
                break;
            case 'busy':
                // Busy icon.
                this.iconPath = new ThemeIcon('vm-running');
                break;
            case 'unknown':
                this.iconPath = new ThemeIcon('question');
                break;
            case 'autorestarting':
            case 'connecting':
            case 'restarting':
            case 'starting':
            case 'idle':
            default:
                // kernel is ok (unknown is also ok, as we dont know what it is).
                this.iconPath = new ThemeIcon('file');
                break;
        }
    }
}
export class KernelTreeView implements TreeDataProvider<Node> {
    public readonly _onDidChangeTreeData = new EventEmitter<void | Node | null | undefined>();
    private cachedKernels?: KernelConnectionMetadata[];
    private readonly disposables: Disposable[] = [];
    private readonly remoteBaseUrls = new Set<string>();
    private groupBy?: 'language' | 'PythonVersion' | 'EnvironmentType' = 'language';
    private groupPythonKernelsBy?: 'PythonVersion' | 'EnvironmentType' = 'EnvironmentType';
    public get onDidChangeTreeData() {
        return this._onDidChangeTreeData.event;
    }
    private static instance: KernelTreeView;
    public static refresh(node?: Node) {
        KernelTreeView.instance._onDidChangeTreeData.fire(node);
    }
    constructor(private readonly kernelService: IExportedKernelService) {
        KernelTreeView.instance = this;
        this.kernelService.onDidChangeKernelSpecifications(
            () => {
                this.cachedKernels = undefined;
                this._onDidChangeTreeData.fire();
            },
            this,
            this.disposables
        );
        this.kernelService.onDidChangeKernels(
            () => {
                this.cachedKernels = undefined;
                this._onDidChangeTreeData.fire();
            },
            this,
            this.disposables
        );
    }
    public dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
    getTreeItem(element: Node): TreeItem | Thenable<TreeItem> {
        switch (element.type) {
            case 'host':
                return new HostTreeItem(element);
            case 'kernelSpecRoot':
                return new KernelSpecifications(element);
            case 'activeKernelRoot':
                return new ActiveKernels(element);
            case 'kernelSpec':
                return new KernelSpecTreeItem(element);
            case 'language':
                return new LanguageTreeItem(element);
            case 'pythonEnvCategory':
                return new PythonEnvironmentTreeItem(element);
            case 'activeLocalKernel':
            case 'activeRemoteKernel': {
                return new ActiveLocalOrRemoteKernelConnectionTreeItem(element);
            }
            default:
                break;
        }
        throw new Error(`Element not supported ${element}`);
    }
    public async getChildren(element?: Node): Promise<Node[]> {
        if (!element) {
            this.cachedKernels = await this.kernelService.getKernelSpecifications();
            const uniqueKernelIds = new Set<string>();
            this.cachedKernels = this.cachedKernels.filter((item) => {
                if (uniqueKernelIds.has(item.id)) {
                    return false;
                }
                // Jupyter extension creates duplicate controllers.
                // One for Jupyter notebooks & one for Interactive window.
                uniqueKernelIds.add(item.id);
                return true;
            });
            this.cachedKernels.sort((a, b) =>
                getDisplayNameOrNameOfKernelConnection(a).localeCompare(getDisplayNameOrNameOfKernelConnection(b))
            );
            this.remoteBaseUrls.clear();
            this.cachedKernels.forEach((item) => {
                if (!isLocalKernelConnection(item)) {
                    this.remoteBaseUrls.add(item.baseUrl);
                }
            });

            if (this.remoteBaseUrls.size) {
                const remoteHosts = Array.from(this.remoteBaseUrls).map(
                    (baseUrl) => <IServerTreeNode>{ type: 'host', baseUrl }
                );
                return [<IServerTreeNode>{ type: 'host' }, ...remoteHosts];
            } else {
                if (!this.cachedKernels) {
                    return [];
                }
                return [
                    <IKernelSpecRootTreeNode>{
                        type: 'kernelSpecRoot'
                    },
                    <IActiveKernelRootTreeNode>{
                        type: 'activeKernelRoot'
                    }
                ];
            }
        }
        switch (element.type) {
            case 'host': {
                if (!this.cachedKernels) {
                    return [];
                }
                return [
                    <IKernelSpecRootTreeNode>{
                        type: 'kernelSpecRoot',
                        baseUrl: element.baseUrl
                    },
                    <IActiveKernelRootTreeNode>{
                        type: 'activeKernelRoot',
                        baseUrl: element.baseUrl
                    }
                ];
            }
            case 'pythonEnvCategory': {
                if (!this.cachedKernels) {
                    return [];
                }
                return this.cachedKernels
                    .filter((item) => {
                        switch (item.kind) {
                            case 'startUsingLocalKernelSpec': {
                                if (item.interpreter && item.kernelSpec.language === PYTHON_LANGUAGE) {
                                    return getPythonEnvironmentCategory(item.interpreter) === element.category;
                                }
                                return false;
                            }
                            case 'startUsingPythonInterpreter':
                                return getPythonEnvironmentCategory(item.interpreter) === element.category;
                            default:
                                return false;
                        }
                    })
                    .map((item) => {
                        return <IKernelSpecTreeNode>{
                            type: 'kernelSpec',
                            kernelConnectionMetadata: item
                        };
                    });
            }
            case 'language':
            case 'kernelSpecRoot': {
                if (!this.cachedKernels) {
                    return [];
                }
                if (
                    this.groupPythonKernelsBy === 'EnvironmentType' &&
                    element.type === 'language' &&
                    element.language === PYTHON_LANGUAGE &&
                    !element.baseUrl
                ) {
                    const categories = new Set<string>();
                    this.cachedKernels.forEach((item) => {
                        switch (item.kind) {
                            case 'startUsingLocalKernelSpec': {
                                if (item.interpreter && item.kernelSpec.language === PYTHON_LANGUAGE) {
                                    categories.add(getPythonEnvironmentCategory(item.interpreter));
                                }
                                break;
                            }
                            case 'startUsingPythonInterpreter': {
                                categories.add(getPythonEnvironmentCategory(item.interpreter));
                                break;
                            }
                        }
                    });
                    return Array.from(categories)
                        .sort()
                        .map((category) => <IPythonEnvironmentCategoryTreeNode>{ category, type: 'pythonEnvCategory' });
                }
                if (this.groupBy === 'language' && element.type === 'kernelSpecRoot') {
                    const languages = new Set<string>();
                    this.cachedKernels.forEach((item) => {
                        switch (item.kind) {
                            case 'startUsingRemoteKernelSpec':
                            case 'startUsingLocalKernelSpec': {
                                if (item.kernelSpec.language) {
                                    languages.add(item.kernelSpec.language);
                                } else {
                                    languages.add('<unknown>');
                                }
                                break;
                            }
                            case 'startUsingPythonInterpreter': {
                                languages.add('python');
                                break;
                            }
                        }
                    });
                    return Array.from(languages)
                        .sort()
                        .map((language) => <ILanguageTreeNode>{ language, type: 'language', baseUrl: element.baseUrl });
                }
                return this.cachedKernels
                    .filter((item) => item.kind !== 'connectToLiveKernel')
                    .filter((item) => {
                        if (element.type !== 'language') {
                            return true;
                        }
                        switch (item.kind) {
                            case 'startUsingRemoteKernelSpec':
                            case 'startUsingLocalKernelSpec':
                                return item.kernelSpec.language
                                    ? item.kernelSpec.language === element.language
                                    : element.language === '<unknown>';
                                break;
                            case 'startUsingPythonInterpreter':
                                return element.language === 'python';

                            default:
                                return false;
                        }
                    })
                    .filter((item) => {
                        if (isLocalKernelConnection(item)) {
                            return element.baseUrl ? false : true;
                        } else {
                            return element.baseUrl === item.baseUrl;
                        }
                    })
                    .map((item) => {
                        return <IKernelSpecTreeNode>{
                            type: 'kernelSpec',
                            kernelConnectionMetadata: item
                        };
                    });
            }
            case 'activeKernelRoot': {
                if (!this.cachedKernels) {
                    return [];
                }
                const activeKernels = await this.kernelService.getActiveKernels();
                // const uniqueKernelIds = new Set<string>();
                // activeKernels = activeKernels.filter((item) => {
                //     if (uniqueKernelIds.has(item.metadata.id)) {
                //         return false;
                //     }
                //     // Jupyter extension creates duplicate controllers.
                //     // One for Jupyter notebooks & one for Interactive window.
                //     uniqueKernelIds.add(item.metadata.id);
                //     return true;
                // });
                if (element.baseUrl) {
                    const remoteActiveKernels = activeKernels.filter((item) => !isLocalKernelConnection(item.metadata));
                    const remoteActiveKernelStartedUsingConnectToRemoveKernelSpec = remoteActiveKernels.filter(
                        (item) => item.metadata.kind === 'startUsingRemoteKernelSpec'
                    );
                    const activeRemoteKernelNodes: IActiveRemoteKernelTreeNode[] = [];
                    const uniqueKernelIds = new Set<string>();
                    await Promise.all(
                        this.cachedKernels
                            .filter((item) => item.kind === 'connectToLiveKernel')
                            .filter((item) => !isLocalKernelConnection(item))
                            .map((item) => item as LiveRemoteKernelConnectionMetadata)
                            .filter((item) => item.baseUrl === element.baseUrl)
                            .map(async (item) => {
                                // When we start a remote jupyter kernel in VSC, the connection informtionation is `startUsingRemoteKernelSpec`,
                                // However we also end up with `connectToLiveRemoteKernel` in the list of kernels.
                                // The latter will allow us to connect to the kernel, whilst the former will start a new kernel.
                                // Take this into account and don't display the `connectToLiveRemoteKernel`.
                                // We can use the existing kernel for status information & the like.
                                if (
                                    remoteActiveKernelStartedUsingConnectToRemoveKernelSpec.some((activeRemote) => {
                                        const kernel = this.kernelService.getKernel(activeRemote.uri);
                                        return kernel?.connection.connection.id === item.kernelModel.id;
                                    })
                                ) {
                                    return;
                                }
                                if (item.kernelModel.id) {
                                    if (item.kernelModel.id && uniqueKernelIds.has(item.kernelModel.id)) {
                                        return;
                                    }
                                    uniqueKernelIds.add(item.kernelModel.id);
                                }
                                const activeInfoIndex = remoteActiveKernels.findIndex(
                                    (activeKernel) => activeKernel.metadata === item
                                );
                                const activeInfo =
                                    activeInfoIndex >= 0 ? remoteActiveKernels[activeInfoIndex] : undefined;
                                if (activeInfoIndex >= 0) {
                                    remoteActiveKernels.splice(activeInfoIndex, 1);
                                }
                                const info = activeInfo
                                    ? await this.kernelService.getKernel(activeInfo?.uri)
                                    : undefined;
                                if (info && activeInfo?.uri) {
                                    activeRemoteKernelNodes.push(<IActiveRemoteKernelTreeNode>{
                                        type: 'activeRemoteKernel',
                                        kernelConnectionMetadata: item,
                                        uri: activeInfo.uri,
                                        ...info,
                                        parent: element
                                    });
                                } else {
                                    // This happens if we have a remote kernel, but we haven't connected to it.
                                    // E.g. we connect to a remote server, and there are kernels running there.
                                    activeRemoteKernelNodes.push(<IActiveRemoteKernelTreeNode>{
                                        type: 'activeRemoteKernel',
                                        kernelConnectionMetadata: item,
                                        parent: element
                                    });
                                }
                            })
                    );
                    remoteActiveKernels.forEach((item) => {
                        if (
                            item.metadata.kind === 'connectToLiveKernel' &&
                            item.metadata.kernelModel.id &&
                            uniqueKernelIds.has(item.metadata.kernelModel.id)
                        ) {
                            return;
                        }
                        // Sometimes we start kernels just to kill them.
                        if (item.metadata.kind === 'startUsingRemoteKernelSpec') {
                            const kernel = this.kernelService.getKernel(item.uri);
                            if (kernel && uniqueKernelIds.has(kernel.connection.connection.id)) {
                                return;
                            }
                        }

                        activeRemoteKernelNodes.push(<IActiveRemoteKernelTreeNode>{
                            type: 'activeRemoteKernel',
                            kernelConnectionMetadata: item.metadata,
                            uri: item.uri,
                            parent: element
                        });
                    });
                    return activeRemoteKernelNodes;
                } else {
                    const localActiveKernelSpecs = activeKernels.filter((item) =>
                        isLocalKernelConnection(item.metadata)
                    );
                    const localActiveKernelsWithInfo = await Promise.all(
                        localActiveKernelSpecs.map(async (item) => {
                            const info = await this.kernelService.getKernel(item.uri);
                            return { ...info, uri: item.uri };
                        })
                    );
                    const activeLocalKernelNodes = localActiveKernelsWithInfo
                        .filter((item) => item.metadata && item.connection)
                        .map((item) => {
                            return <IActiveLocalKernelTreeNode>{
                                connection: item.connection!,
                                kernelConnectionMetadata: item.metadata!,
                                uri: item.uri,
                                type: 'activeLocalKernel',
                                parent: element
                            };
                        });

                    activeLocalKernelNodes.forEach((item) => this.trackKernelConnection(item));
                    return activeLocalKernelNodes;
                }
            }
            default:
                return [];
        }
    }
    public static register(kernelService: IExportedKernelService, disposables: Disposable[]) {
        const provider = new KernelTreeView(kernelService);
        disposables.push(provider);
        const options = {
            treeDataProvider: provider,
            canSelectMany: false,
            showCollapseAll: true
        };
        const treeView = window.createTreeView<Node>('jupyterKernelsView', options);
        disposables.push(treeView);
    }
    private readonly mappedActiveLocalKernelConnections: IActiveLocalKernelTreeNode[] = [];
    private trackKernelConnection(localActiveKernel: IActiveLocalKernelTreeNode) {
        if (
            this.mappedActiveLocalKernelConnections.find(
                (item) =>
                    item.connection === localActiveKernel.connection &&
                    item.kernelConnectionMetadata === localActiveKernel.kernelConnectionMetadata &&
                    item.uri.toString() === localActiveKernel.uri.toString() &&
                    item.type === localActiveKernel.type
            )
        ) {
            // Already tracked.
            return;
        }
        this.mappedActiveLocalKernelConnections.push(localActiveKernel);
        const onConnectionStatusChanged = () => {
            this._onDidChangeTreeData.fire(localActiveKernel);
        };
        const onStatusChanged = () => {
            this._onDidChangeTreeData.fire(localActiveKernel);
        };
        localActiveKernel.connection.connection.connectionStatusChanged.connect(onConnectionStatusChanged, this);
        localActiveKernel.connection.connection.statusChanged.connect(onStatusChanged, this);
        const disposable = new Disposable(() => {
            if (localActiveKernel.connection) {
                localActiveKernel.connection.connection.connectionStatusChanged.disconnect(
                    onConnectionStatusChanged,
                    this
                );
                localActiveKernel.connection.connection.statusChanged.disconnect(onStatusChanged, this);
            }
        });
        this.disposables.push(disposable);
    }
}

function isLocalKernelConnection(
    connection: KernelConnectionMetadata
): connection is PythonKernelConnectionMetadata | LocalKernelSpecConnectionMetadata {
    return connection.kind === 'startUsingLocalKernelSpec' || connection.kind === 'startUsingPythonInterpreter';
}
