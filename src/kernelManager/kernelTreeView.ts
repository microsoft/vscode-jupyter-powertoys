// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from '../vscode-path/path';
import { Status } from '@jupyterlab/services/lib/kernel/kernel';
import {
    Disposable,
    EventEmitter,
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
    KernelConnectionMetadata,
    LiveRemoteKernelConnectionMetadata,
    LocalKernelSpecConnectionMetadata,
    PythonKernelConnectionMetadata,
    getEnvironmentTypeFromUri,
    getEnvironmentVersionFromUri,
    getPythonEnvironmentName
} from './vscodeJupyter';
import { getDisplayPath, getLanguageExtension } from './utils';
import { PYTHON_LANGUAGE } from './constants';
import { getPythonEnvironmentCategory } from './integration';
import {
    Node,
    IActiveKernelRootTreeNode,
    IActiveLocalKernelTreeNode,
    IActiveRemoteKernelTreeNode,
    IKernelSpecRootTreeNode,
    IKernelSpecTreeNode,
    ILanguageTreeNode,
    IPythonEnvironmentCategoryTreeNode,
    IServerTreeNode,
    ICustomNodeFromAnotherProvider
} from './types';
import { ActiveKernelChildNodesProviderRegistry, IActiveKernelChildNodesProvider } from './kernelChildNodeProvider';
import { PythonExtension } from '@vscode/python-extension';

export const iPyNbNameToTemporarilyStartKernel = '__dummy__.ipynb';

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
        kernelConnection.kind === 'connectToLiveRemoteKernel'
            ? kernelConnection.kernelModel.display_name
            : kernelConnection.kernelSpec?.display_name;
    const name =
        kernelConnection.kind === 'connectToLiveRemoteKernel'
            ? kernelConnection.kernelModel.name
            : kernelConnection.kernelSpec?.name;

    const interpreterName = kernelConnection.kind === 'startUsingPythonInterpreter' ? '' : undefined;

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
export async function getDisplayNameOrNameOfKernelConnection(
    kernelConnection: KernelConnectionMetadata | undefined,
    pythonApi: PythonExtension
) {
    let oldDisplayName = getOldFormatDisplayNameOrNameOfKernelConnection(kernelConnection);
    if (!kernelConnection) {
        return oldDisplayName;
    }
    switch (kernelConnection.kind) {
        case 'connectToLiveRemoteKernel': {
            return oldDisplayName;
        }
        case 'startUsingRemoteKernelSpec':
        case 'startUsingLocalKernelSpec': {
            const envType = await getEnvironmentTypeFromUri(kernelConnection.interpreter?.uri, pythonApi);
            const envNamePromise = getPythonEnvironmentName(kernelConnection.interpreter?.uri, pythonApi);
            if (envType && envType !== EnvironmentType.Global) {
                if (kernelConnection.kernelSpec.language === PYTHON_LANGUAGE) {
                    const [version, envName] = await Promise.all([
                        getEnvironmentVersionFromUri(kernelConnection.interpreter?.uri, pythonApi),
                        envNamePromise
                    ]);
                    const pythonVersion =
                        version?.major && version?.minor && version?.micro
                            ? `Python ${version.major}.${version.minor}.${version.micro}`
                            : `Python`;
                    return envName ? `${envName} (${pythonVersion})` : oldDisplayName;
                } else {
                    const envName = await envNamePromise;
                    if (!oldDisplayName) {
                        return envName;
                    }
                    // Non-Python kernelspec that launches via python interpreter
                    return envName ? `${oldDisplayName} (${envName})` : oldDisplayName;
                }
            } else {
                return oldDisplayName || (await envNamePromise) || '';
            }
        }
        case 'startUsingPythonInterpreter':
            const envType = await getEnvironmentTypeFromUri(kernelConnection.interpreter?.uri, pythonApi);
            if (envType && envType !== EnvironmentType.Global) {
                const [versionInfo, envNameInfo] = await Promise.all([
                    getEnvironmentVersionFromUri(kernelConnection.interpreter?.uri, pythonApi),
                    getPythonEnvironmentName(kernelConnection.interpreter?.uri, pythonApi)
                ]);
                const version =
                    versionInfo?.major && versionInfo?.minor && versionInfo?.micro
                        ? `Python ${versionInfo.major}.${versionInfo.minor}.${versionInfo.micro}`
                        : `Python`;
                if (kernelConnection.kind === 'startUsingPythonInterpreter' && envType === EnvironmentType.Conda) {
                    const envName = envNameInfo || '';
                    if (envName) {
                        return `${envName}${version}`;
                    }
                }

                const pythonDisplayName = version.trim();
                return envNameInfo
                    ? `${envNameInfo} ${pythonDisplayName ? `(${pythonDisplayName})` : ''}`
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
            return notebookPath.substring(0, notebookPath.lastIndexOf(jvscIdentifier));
        }
    }
    return notebookPath;
}
function getKernelConnectionLanguage(connection: KernelConnectionMetadata) {
    switch (connection.kind) {
        case 'connectToLiveRemoteKernel': {
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
    constructor(public readonly data: IKernelSpecTreeNode, private readonly pythonApi: PythonExtension) {
        super('', TreeItemCollapsibleState.None);
        switch (data.kernelConnectionMetadata.kind) {
            case 'startUsingLocalKernelSpec':
                this.description = data.kernelConnectionMetadata.kernelSpec.specFile
                    ? getDisplayPath(data.kernelConnectionMetadata.kernelSpec.specFile)
                    : '';
                break;
            case 'startUsingPythonInterpreter':
                this.description = getDisplayPath(data.kernelConnectionMetadata.interpreter.uri.fsPath);
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
    public async resolve() {
        this.label = await getDisplayNameOrNameOfKernelConnection(this.data.kernelConnectionMetadata, this.pythonApi);
    }
}
class ActiveLocalOrRemoteKernelConnectionTreeItem extends TreeItem {
    constructor(
        public readonly data: IActiveLocalKernelTreeNode | IActiveRemoteKernelTreeNode,
        private readonly pythonApi: PythonExtension
    ) {
        super('', TreeItemCollapsibleState.Collapsed);
        if (data.uri && !data.uri.fsPath.endsWith(iPyNbNameToTemporarilyStartKernel)) {
            this.description = path.basename(data.uri.fsPath);
        } else if (data.kernelConnectionMetadata.kind === 'connectToLiveRemoteKernel') {
            const nbPath =
                data.kernelConnectionMetadata.kernelModel?.notebook?.path ||
                data.kernelConnectionMetadata.kernelModel?.model?.path;
            this.description = nbPath && path.basename(removeNotebookSuffixAddedByExtension(nbPath));
        }
        const ext = getLanguageExtension(getKernelConnectionLanguage(data.kernelConnectionMetadata));
        this.resourceUri = ext ? Uri.parse(`one${ext}`) : undefined;
        this.iconPath = new ThemeIcon('file');
        const prefix = data.type === 'activeLocalKernel' ? 'local' : 'remote';
        this.contextValue = `${prefix}:activeKernel:${this.data.connection?.kernel?.status || 'dead'}`;
        console.log(this.contextValue);
        const tooltips: string[] = [];
        if (this.data.connection?.kernel?.status) {
            tooltips.push(`Status ${this.data.connection?.kernel?.status}`);
        }
        if (data.kernelConnectionMetadata.kind === 'connectToLiveRemoteKernel') {
            if (tooltips.length === 0 && data.kernelConnectionMetadata.kernelModel.execution_state) {
                tooltips.push(`Status ${data.kernelConnectionMetadata.kernelModel.execution_state}`);
            }
            const time =
                data.kernelConnectionMetadata.kernelModel.lastActivityTime ||
                data.kernelConnectionMetadata.kernelModel.last_activity;
            if (time) {
                tooltips.push(`Last activity ${new Date(time).toLocaleString()}`);
            }
            // const connections =
            //     data.kernelConnectionMetadata.kernelModel.connections ||
            //     data.kernelConnectionMetadata.kernelModel.numberOfConnections;
            // if (connections) {
            //     tooltips.push(`${connections} connection(s)`);
            // }
        }
        if (this.data.connection?.kernel?.status) {
            tooltips.push(`Connection ${this.data.connection?.kernel?.status}`);
        }
        this.tooltip = tooltips.length
            ? tooltips.join(', ')
            : (this.description as string) || (this.label as string) || '';
        if (this.data.connection) {
            if (this.data.connection.kernel?.connectionStatus !== 'connected' && this.data.connection.kernel) {
                this.updateIcon(this.data.connection.kernel?.connectionStatus);
            } else if (this.data.connection.kernel) {
                this.updateIcon(this.data.connection.kernel?.status);
            }
        }
    }
    public async resolve() {
        this.label = await getDisplayNameOrNameOfKernelConnection(this.data.kernelConnectionMetadata, this.pythonApi);
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
    private cachedKernels?: (KernelConnectionMetadata & { displayName: string })[];
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
    constructor(private readonly kernelService: IExportedKernelService, private readonly pythonApi: PythonExtension) {
        KernelTreeView.instance = this;
        this.kernelService.onDidChangeKernelSpecifications(
            () => {
                this.cachedKernels = undefined;
                this._onDidChangeTreeData.fire(undefined);
            },
            this,
            this.disposables
        );
        this.kernelService.onDidChangeKernels(
            () => {
                this.cachedKernels = undefined;
                this._onDidChangeTreeData.fire(undefined);
            },
            this,
            this.disposables
        );
    }
    public dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
    async getTreeItem(element: Node): Promise<TreeItem> {
        switch (element.type) {
            case 'host':
                return new HostTreeItem(element);
            case 'kernelSpecRoot':
                return new KernelSpecifications(element);
            case 'activeKernelRoot':
                return new ActiveKernels(element);
            case 'kernelSpec':
                const item = new KernelSpecTreeItem(element, this.pythonApi);
                await item.resolve();
                return item;
            case 'language':
                return new LanguageTreeItem(element);
            case 'pythonEnvCategory':
                return new PythonEnvironmentTreeItem(element);
            case 'activeLocalKernel':
            case 'activeRemoteKernel': {
                const item = new ActiveLocalOrRemoteKernelConnectionTreeItem(element, this.pythonApi);
                await item.resolve();
                return item;
            }
            case 'customNodeFromAnotherProvider': {
                const provider = ActiveKernelChildNodesProviderRegistry.instance.registeredProviders.get(
                    element.providerId
                );
                return provider!.getTreeItem(element);
            }
            default:
                break;
        }
        throw new Error(`Element not supported ${element}`);
    }
    public async getChildren(element?: Node): Promise<Node[]> {
        if (!element) {
            const specs = await this.kernelService.getKernelSpecifications();
            this.cachedKernels = (await Promise.all(
                specs.map(async (k) => {
                    try {
                        return {
                            ...k,
                            displayName: await getDisplayNameOrNameOfKernelConnection(k, this.pythonApi)
                        };
                    } catch (ex) {
                        return {
                            ...k,
                            displayName: 'error'
                        };
                    }
                })
            )) as any;
            const uniqueKernelIds = new Set<string>();
            this.cachedKernels = this.cachedKernels!.filter((item) => {
                if (uniqueKernelIds.has(item.id)) {
                    return false;
                }
                // Jupyter extension creates duplicate controllers.
                // One for Jupyter notebooks & one for Interactive window.
                uniqueKernelIds.add(item.id);
                return true;
            });
            this.cachedKernels.sort((a, b) => a.displayName?.localeCompare(b.displayName || ''));
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
                                    return (
                                        getPythonEnvironmentCategory(item.interpreter, this.pythonApi) ===
                                        element.category
                                    );
                                }
                                return false;
                            }
                            case 'startUsingPythonInterpreter':
                                return (
                                    getPythonEnvironmentCategory(item.interpreter, this.pythonApi) === element.category
                                );
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
                                    categories.add(getPythonEnvironmentCategory(item.interpreter, this.pythonApi));
                                }
                                break;
                            }
                            case 'startUsingPythonInterpreter': {
                                categories.add(getPythonEnvironmentCategory(item.interpreter, this.pythonApi));
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
                    .filter((item) => item.kind !== 'connectToLiveRemoteKernel')
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
                const activeKernels = this.kernelService.getActiveKernels();
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
                    const remoteActiveKernels: {
                        metadata: KernelConnectionMetadata;
                        uri: Uri | undefined;
                    }[] = activeKernels.filter((item) => !isLocalKernelConnection(item.metadata));
                    const remoteActiveKernelStartedUsingConnectToRemoveKernelSpec = remoteActiveKernels.filter(
                        (item) => item.metadata.kind === 'startUsingRemoteKernelSpec'
                    );
                    const activeRemoteKernelNodes: IActiveRemoteKernelTreeNode[] = [];
                    const uniqueKernelIds = new Set<string>();
                    await Promise.all(
                        this.cachedKernels
                            .filter((item) => item.kind === 'connectToLiveRemoteKernel')
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
                                        const kernel =
                                            activeRemote.uri && this.kernelService.getKernel(activeRemote.uri);
                                        return kernel?.connection.kernel?.id === item.kernelModel.id;
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
                                const info = activeInfo?.uri
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
                            item.metadata.kind === 'connectToLiveRemoteKernel' &&
                            item.metadata.kernelModel.id &&
                            uniqueKernelIds.has(item.metadata.kernelModel.id)
                        ) {
                            return;
                        }
                        // Sometimes we start kernels just to kill them.
                        if (item.metadata.kind === 'startUsingRemoteKernelSpec' && item.uri) {
                            const kernel = this.kernelService.getKernel(item.uri);
                            if (
                                kernel &&
                                kernel.connection.kernel &&
                                uniqueKernelIds.has(kernel.connection.kernel?.id)
                            ) {
                                return;
                            }
                        }

                        if (
                            item.metadata.kind === 'connectToLiveRemoteKernel' &&
                            item.metadata.baseUrl !== element.baseUrl
                        ) {
                            return;
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
                        localActiveKernelSpecs
                            .filter((item) => item.uri)
                            .map(async (item) => {
                                const info = await this.kernelService.getKernel(item.uri!);
                                return { ...info, uri: item.uri! };
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
            case 'activeLocalKernel':
            case 'activeRemoteKernel': {
                let nodes: ICustomNodeFromAnotherProvider[] = [];
                Array.from(ActiveKernelChildNodesProviderRegistry.instance.registeredProviders.values()).forEach(
                    (provider) => {
                        this.addOnDidProviderNodeChange(provider);
                        const children = provider.getChildren(element);
                        nodes = nodes.concat(children);
                    }
                );
                return nodes;
            }
            case 'customNodeFromAnotherProvider': {
                const provider = ActiveKernelChildNodesProviderRegistry.instance.registeredProviders.get(
                    element.providerId
                );
                if (provider) {
                    this.addOnDidProviderNodeChange(provider);
                    return provider.getChildren(element);
                } else {
                    console.error('Unknown provider for custom nodes', element.providerId);
                    return [];
                }
            }
            default:
                return [];
        }
    }
    public static register(kernelService: IExportedKernelService, disposables: Disposable[]) {
        const pythonApi = PythonExtension.api().then((api) => {
            const provider = new KernelTreeView(kernelService, api);
            disposables.push(provider);
            const options = {
                treeDataProvider: provider,
                canSelectMany: false,
                showCollapseAll: true
            };
            const treeView = window.createTreeView<Node>('jupyterKernelsView', options);
            disposables.push(treeView);
        });
    }
    private readonly providersAlreadyHandled = new WeakSet<IActiveKernelChildNodesProvider>();
    private addOnDidProviderNodeChange(provider: IActiveKernelChildNodesProvider) {
        if (this.providersAlreadyHandled.has(provider)) {
            return;
        }
        this.providersAlreadyHandled.add(provider);
        if (!provider.onDidChangeTreeData) {
            return;
        }
        provider.onDidChangeTreeData((node) => this._onDidChangeTreeData.fire(node), this, this.disposables);
    }
    private readonly mappedActiveLocalKernelConnections: IActiveLocalKernelTreeNode[] = [];
    private trackKernelConnection(localActiveKernel: IActiveLocalKernelTreeNode) {
        if (
            this.mappedActiveLocalKernelConnections.find(
                (item) =>
                    item.connection === localActiveKernel.connection &&
                    item.kernelConnectionMetadata === localActiveKernel.kernelConnectionMetadata &&
                    (item.uri ? item.uri?.toString() === localActiveKernel.uri?.toString() : true) &&
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
        localActiveKernel.connection.kernel?.connectionStatusChanged.connect(onConnectionStatusChanged, this);
        localActiveKernel.connection.kernel?.statusChanged.connect(onStatusChanged, this);
        const disposable = new Disposable(() => {
            if (localActiveKernel.connection) {
                localActiveKernel.connection.kernel?.connectionStatusChanged.disconnect(
                    onConnectionStatusChanged,
                    this
                );
                localActiveKernel.connection.kernel?.statusChanged.disconnect(onStatusChanged, this);
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
