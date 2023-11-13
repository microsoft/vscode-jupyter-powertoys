/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    IActiveLocalKernelTreeNode,
    IActiveRemoteKernelTreeNode,
    ICustomNodeFromAnotherProvider
} from '../kernelManager/types';
import { commands, Disposable, env, EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { IActiveKernelChildNodesProvider } from '../kernelManager/kernelChildNodeProvider';
import { IExportedKernelService } from '../kernelManager/vscodeJupyter';
import { IAnyMessageArgs, IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';
import { Kernel, KernelMessage } from '@jupyterlab/services/lib/kernel';
import { IIOPubMessage, IMessage, IOPubMessageType, MessageType } from '@jupyterlab/services/lib/kernel/messages';
import type { Session } from '@jupyterlab/services';

type RootNode = ICustomNodeFromAnotherProvider & {
    __type: 'rootNode';
    connection: Kernel.IKernelConnection;
};
type Node = RootNode | MessageNode | DataNode;

class MessagesTreeItem extends TreeItem {
    constructor(public readonly data: RootNode) {
        super('Kernel Messages', TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'kernelMessagesRoot';
    }
}
const requestIconsByMessageType = new Map<MessageType, string>([
    ['clear_output', 'clear-all'],
    ['error', 'error'],
    ['complete_request', 'symbol-enum'],
    ['is_complete_request', 'symbol-enum'],
    ['execute_request', 'play'],
    ['input_request', 'play'],
    ['inspect_request', 'inspect'],
    ['debug_request', 'debug'],
    ['history_request', 'history'],
    ['interrupt_request', 'symbol-event'],
    ['kernel_info_request', 'info'],
    ['comm_info_request', 'info'],
    ['comm_close', 'close'],
    ['comm_open', 'folder-opened'],
    ['comm_msg', 'gear'],
    ['shutdown_request', 'close']
]);
const responseIconsByMessageType = new Map<MessageType, string>([
    ['clear_output', 'clear-all'],
    ['error', 'error'],
    ['comm_close', 'sign-out'],
    ['comm_open', 'sign-in'],
    ['comm_msg', 'gear'],
    ['status', 'pulse'],
    ['debug_event', 'debug'],
    ['debug_reply', 'debug'],
    ['display_data', 'output'],
    ['stream', 'symbol-key']
]);
function getTextForClipboard(value: unknown) {
    if (typeof value === 'string') {
        return value.trim();
    } else if (typeof value === 'number') {
        return value.toString();
    } else if (typeof value === 'boolean') {
        return value.toString();
    }
    return undefined;
}
class MessageTreeItem extends TreeItem {
    constructor(public readonly data: MessageNode) {
        super(data.label, TreeItemCollapsibleState.Collapsed);
        this.description = data.description;
        this.contextValue = `kernelMessageItem:${data.__type}:${data.clipboardText ? 'canCopyToClipboard' : ''}`;
        if (data.__type === 'parentMessageNode' || data.direction === 'send') {
            this.iconPath = new ThemeIcon('call-outgoing');
            if (data.__type !== 'parentMessageNode') {
                const icon = requestIconsByMessageType.get(data.msg.header.msg_type) || 'indent';
                this.iconPath = new ThemeIcon(icon);
            }
            const exec = data.msg as KernelMessage.IExecuteRequestMsg;
            if (data.msg.header.msg_type === 'execute_request' && data.msg.channel === 'shell' && exec.content.code) {
                this.description = getSingleLineValue(exec.content.code);
                this.tooltip = exec.content.code;
            }
            const complete = data.msg as KernelMessage.IIsCompleteRequestMsg;
            if (
                data.msg.header.msg_type === 'complete_request' &&
                data.msg.channel === 'shell' &&
                complete.content.code
            ) {
                this.description = getSingleLineValue(complete.content.code);
                this.tooltip = complete.content.code;
            }
            const inspect = data.msg as KernelMessage.IInspectRequestMsg;
            if (
                data.msg.header.msg_type === 'inspect_request' &&
                data.msg.channel === 'shell' &&
                inspect.content.code
            ) {
                this.description = getSingleLineValue(inspect.content.code);
                this.tooltip = inspect.content.code;
            }
            const debugRequest = data.msg as KernelMessage.IDebugRequestMsg;
            if (
                data.msg.header.msg_type === 'debug_request' &&
                data.msg.channel === 'control' &&
                debugRequest.content.command
            ) {
                let descriptionParts = [`${debugRequest.content.command} (seq: ${debugRequest.content.seq}`];
                this.description = `${debugRequest.content.command} (seq: ${debugRequest.content.seq})`;
                if (
                    (debugRequest.content.command === 'evaluate' ||
                        debugRequest.content.command === 'variables' ||
                        debugRequest.content.command === 'stackTrace') &&
                    debugRequest.content.arguments &&
                    typeof debugRequest.content.arguments === 'object'
                ) {
                    this.description = descriptionParts
                        .concat([`, arguments, ${JSON.stringify(debugRequest.content.arguments)})`])
                        .join('');
                }
                if (
                    debugRequest.content.command === 'dumpCell' &&
                    debugRequest.content.arguments &&
                    typeof debugRequest.content.arguments === 'object' &&
                    typeof debugRequest.content.arguments['code'] === 'string'
                ) {
                    descriptionParts = [`${debugRequest.content.command}`];
                    this.description = descriptionParts
                        .concat([
                            `, ${debugRequest.content.arguments.code
                                .split('\r\n')
                                .join('\\r\\n')
                                .split('\n')
                                .join('\\n')}`
                        ])
                        .join('');
                    this.tooltip = debugRequest.content.arguments.code;
                }
                if (
                    debugRequest.content.command === 'setBreakpoints' &&
                    debugRequest.content.arguments &&
                    typeof debugRequest.content.arguments === 'object' &&
                    typeof debugRequest.content.arguments['source'] === 'object' &&
                    typeof debugRequest.content.arguments['source']['path'] === 'string' &&
                    Array.isArray(debugRequest.content.arguments['breakpoints'])
                ) {
                    descriptionParts = [
                        `${debugRequest.content.command}, source: ${debugRequest.content.arguments.source.path}`
                    ];
                    const lines: string[] = [];
                    debugRequest.content.arguments['breakpoints'].forEach((line) => {
                        lines.push(line.line);
                        descriptionParts.push(`\n,line: ${line.line}`);
                    });
                    this.description = descriptionParts.join('');
                    this.tooltip = `${debugRequest.content.arguments.source.path}\nlines: ${lines.join(', ')}`;
                }
            }
        } else if (data.direction === 'recv') {
            const icon = responseIconsByMessageType.get(data.msg.header.msg_type) || 'call-incoming';
            this.iconPath = new ThemeIcon(icon);

            const statusMsg = data.msg as KernelMessage.IStatusMsg;
            if (
                data.msg.header.msg_type === 'status' &&
                data.msg.channel === 'iopub' &&
                statusMsg.content.execution_state
            ) {
                this.description = statusMsg.content.execution_state;
            }
            const execInput = data.msg as KernelMessage.IExecuteInputMsg;
            if (
                data.msg.header.msg_type === 'execute_input' &&
                data.msg.channel === 'iopub' &&
                typeof execInput.content.execution_count === 'number'
            ) {
                this.description = `execution_count = ${execInput.content.execution_count}`;
            }
            const stream = data.msg as KernelMessage.IStreamMsg;
            if (
                data.msg.header.msg_type === 'stream' &&
                data.msg.channel === 'iopub' &&
                stream.content.name &&
                stream.content.text
            ) {
                this.description = `${stream.content.name}: ${stream.content.text
                    .split('\r\n')
                    .join('\\r\\n')
                    .split('\n')
                    .join('\\n')}`;
                this.tooltip = stream.content.text;
            }

            const execReply = data.msg as KernelMessage.IExecuteReplyMsg;
            if (data.msg.header.msg_type === 'execute_reply' && data.msg.channel === 'shell') {
                this.description = `${execReply.content.status}, execution_count = ${execReply.content.execution_count}`;
            }

            const inspect = data.msg as KernelMessage.IInspectReplyMsg;
            if (data.msg.header.msg_type === 'inspect_reply' && data.msg.channel === 'shell') {
                this.description = inspect.content.status;
            }

            const debugReply = data.msg as KernelMessage.IDebugReplyMsg;
            if (
                data.msg.header.msg_type === 'debug_reply' &&
                data.msg.channel === 'control' &&
                debugReply.content.command
            ) {
                this.description = `${debugReply.content.command} (success: ${debugReply.content.success}, seq: ${debugReply.content.seq})`;
                if (
                    debugReply.content.command === 'dumpCell' &&
                    debugReply.content.body &&
                    typeof debugReply.content.body['sourcePath'] === 'string'
                ) {
                    this.description = `${debugReply.content.command}, ${debugReply.content.body['sourcePath']}`;
                }
            }

            const debugEvent = data.msg as KernelMessage.IDebugEventMsg;
            if (
                data.msg.header.msg_type === 'debug_event' &&
                data.msg.channel === 'iopub' &&
                debugEvent.content.event
            ) {
                this.description = `${debugEvent.content.event} (seq: ${debugEvent.content.seq})`;
            }
            const errorMsg = data.msg as KernelMessage.IErrorMsg;
            if (data.msg.header.msg_type === 'error' && data.msg.channel === 'iopub' && errorMsg.content.ename) {
                this.description = errorMsg.content.ename;
            }
        }
        if (!this.tooltip) {
            this.tooltip = (this.description || '').replace(/\\n/g, '\n');
        }
    }
}
class DataTreeItem extends TreeItem {
    constructor(public readonly data: DataNode) {
        super(data.label, data.hasChildren ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        this.description = data.description;
        this.tooltip = data.tooltip;
        this.contextValue = `kernelMessageItem:${data.__type}:${data.clipboardText ? 'canCopyToClipboard' : ''}`;
    }
}

type MessageNode =
    | (ICustomNodeFromAnotherProvider & {
          __type: 'parentMessageNode';
          direction: 'send';
          label: string;
          description: string;
          msg_id: string;
          parent?: MessageNode;
          msg: KernelMessage.IMessage;
          connection: Kernel.IKernelConnection;
          isTopLevelMessage?: boolean;
          clipboardText?: string;
      })
    | (ICustomNodeFromAnotherProvider & {
          __type: 'messageNode';
          direction: 'send';
          label: string;
          description: string;
          msg_id: string;
          parent?: MessageNode;
          msg: KernelMessage.IMessage;
          connection: Kernel.IKernelConnection;
          isTopLevelMessage?: boolean;
          clipboardText?: string;
      })
    | (ICustomNodeFromAnotherProvider & {
          __type: 'messageNode';
          direction: 'recv';
          label: string;
          description: string;
          msg_id: string;
          parent?: MessageNode;
          msg: KernelMessage.IMessage;
          connection: Kernel.IKernelConnection;
          isTopLevelMessage?: boolean;
          clipboardText?: string;
      });
type DataNode =
    | (ICustomNodeFromAnotherProvider & {
          __type: 'dataNode';
          label: string;
          description: string;
          tooltip: string;
          msg: KernelMessage.IMessage;
          property: string;
          paths: (string | number)[];
          hasChildren: boolean;
          clipboardText?: string;
      })
    | (ICustomNodeFromAnotherProvider & {
          __type: 'dataNode';
          label: string;
          description: string;
          tooltip: string;
          msg: KernelMessage.IMessage;
          index: number;
          paths: (string | number)[];
          clipboardText?: string;
          hasChildren: boolean;
      });

function getStringRepresentation(value: unknown) {
    if (value === undefined) {
        return 'undefined';
    } else if (value === null) {
        return 'null';
    } else {
        return (value as string).toString();
    }
}
function getSingleLineValue(value: string) {
    return value.split('\r\n').join('\\r\\n').split('\n').join('\\n');
}
export class ActiveKernelMessageProvider implements IActiveKernelChildNodesProvider {
    private activated?: boolean;
    private readonly _onDidChangeTreeData = new EventEmitter<
        void | ICustomNodeFromAnotherProvider | null | undefined
    >();
    private readonly connections = new WeakMap<Kernel.IKernelConnection, RootNode | undefined>();
    private readonly disposables: Disposable[] = [];
    private readonly messagesByConnection = new WeakMap<
        Kernel.IKernelConnection,
        { messages: MessageNode[]; requestsById: Map<string, { parent: MessageNode; children: MessageNode[] }> }
    >();
    public get onDidChangeTreeData() {
        return this._onDidChangeTreeData.event;
    }
    constructor(private readonly kernelService: IExportedKernelService) {}
    public readonly id = 'kernelSpy';
    private messageViewType: 'tree' | 'list' = 'tree';
    public activate() {
        if (this.activated) {
            return;
        }
        this.disposables.push(
            ...[
                commands.registerCommand('jupyter-kernelManager.clearKernelMessages', (data: RootNode) => {
                    const info = this.getConnectionInfo(data.connection);
                    info.requestsById.clear();
                    info.messages.splice(0, info.messages.length);
                    this._onDidChangeTreeData.fire(data);
                }),
                commands.registerCommand('jupyter-kernelManager.viewKernelMessagesAsTree', (data: RootNode) => {
                    this.messageViewType = 'tree';
                    this._onDidChangeTreeData.fire(data);
                }),
                commands.registerCommand('jupyter-kernelManager.viewKernelMessagesAsList', (data: RootNode) => {
                    this.messageViewType = 'list';
                    this._onDidChangeTreeData.fire(data);
                }),
                commands.registerCommand('jupyter-kernelManager.kernelMessageCopy', (data: DataNode | MessageNode) => {
                    env.clipboard.writeText(data.clipboardText || '');
                })
            ]
        );
        this.activated = true;
        this.kernelService.onDidChangeKernels(
            () => {
                const kernels = this.kernelService.getActiveKernels();
                kernels.forEach((item) => {
                    if (!item.uri) {
                        return;
                    }
                    const kernel = this.kernelService.getKernel(item.uri);
                    if (!kernel) {
                        return;
                    }
                    this.addHandler(kernel.connection);
                });
            },
            this,
            this.disposables
        );
    }
    public dispose() {
        this._onDidChangeTreeData.dispose();
        this.disposables.forEach((d) => d.dispose());
    }
    getChildren(
        node: IActiveLocalKernelTreeNode | IActiveRemoteKernelTreeNode | ICustomNodeFromAnotherProvider
    ): ICustomNodeFromAnotherProvider[] {
        if (!this.activated) {
            return [];
        }
        if (node.type === 'activeLocalKernel' || node.type === 'activeRemoteKernel') {
            if (!node.connection?.kernel) {
                return [];
            }
            const rootNode: RootNode = {
                type: 'customNodeFromAnotherProvider',
                __type: 'rootNode',
                providerId: this.id,
                connection: node.connection.kernel
            };
            this.addHandler(node.connection, rootNode);
            return [rootNode];
        }
        if (node.type !== 'customNodeFromAnotherProvider') {
            return [];
        }
        const ourNode = node as Node;
        if (ourNode.__type === 'rootNode') {
            const messages = this.getConnectionInfo(ourNode.connection).messages;
            if (this.messageViewType === 'tree') {
                return messages.filter((msg) => msg.isTopLevelMessage);
            } else {
                return messages;
            }
        } else if (ourNode.__type === 'parentMessageNode') {
            const info = this.getConnectionInfo(ourNode.connection);
            const children = info.requestsById.get(ourNode.msg_id);
            if (children) {
                return children.children;
            } else {
                return [];
            }
        } else if (ourNode.__type === 'messageNode') {
            const header = ourNode.msg.header as KernelMessage.IHeader<any>;
            return Object.keys(ourNode.msg).map((prop) => {
                const value = (ourNode.msg as any)[prop];
                const hasChildren =
                    typeof value !== 'undefined' &&
                    value !== null &&
                    (typeof value === 'object' || Array.isArray(value));
                const isEmptyObject = hasChildren && !Array.isArray(value) && Object.keys(value).length === 0;
                const isEmptyArray = hasChildren && Array.isArray(value) && value.length === 0;
                const stringValue =
                    typeof value === 'string' ? getSingleLineValue(value) : getStringRepresentation(value);
                let description = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : stringValue;
                let tooltip = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : getStringRepresentation(value);
                if (!value) {
                } else if (prop === 'header') {
                    description = `msg_id: ${header.msg_id}`;
                } else if (prop === 'parent_header') {
                    const parentHeader = ourNode.msg.parent_header as KernelMessage.IHeader<any>;
                    if (parentHeader && 'msg_id' in parentHeader) {
                        description = `msg_id: ${parentHeader.msg_id}`;
                    }
                } else if (prop === 'content' && header.msg_type === 'comm_open') {
                    const commOpen = ourNode.msg as KernelMessage.ICommOpenMsg;
                    description = `${commOpen.content.target_name}: ${commOpen.content.comm_id}`;
                    tooltip = `target_name: ${commOpen.content.target_name}\ncomm_id: ${commOpen.content.comm_id}\target_module: ${commOpen.content.target_module}`;
                } else if (prop === 'content' && header.msg_type === 'comm_msg') {
                    const commMsg = ourNode.msg as KernelMessage.ICommMsgMsg;
                    description = `comm_id: ${commMsg.content.comm_id}`;
                } else if (prop === 'content' && header.msg_type === 'display_data') {
                    const commMsg = ourNode.msg as KernelMessage.IDisplayDataMsg;
                    const mimes = Object.keys(commMsg.content.data);
                    tooltip = mimes.join(', ');
                    description = mimes
                        .map((mime) => {
                            if (mime === 'application/vnd.jupyter.widget-view+json') {
                                const mimeData = (commMsg.content.data[mime] as any) || { model_id: '' };
                                return `${mime}:${mimeData['model_id']}`;
                            } else {
                                return mime;
                            }
                        })
                        .join(', ');
                }

                return <DataNode>{
                    __type: 'dataNode',
                    description,
                    tooltip,
                    property: prop,
                    label: prop,
                    paths: [prop],
                    providerId: ourNode.providerId,
                    type: 'customNodeFromAnotherProvider',
                    msg: ourNode.msg,
                    hasChildren: hasChildren && !isEmptyObject && !isEmptyArray,
                    clipboardText: getTextForClipboard(value)
                };
            });
        } else {
            let data = ourNode.msg;
            const currentPath = ourNode.paths.join('.');
            ourNode.paths.forEach((path) => {
                data = (data as any)[path];
            });
            if (typeof data === 'undefined' || data === null) {
                return [];
            }
            const header = ourNode.msg.header as KernelMessage.IHeader<any>;
            if (Array.isArray(data)) {
                return data.map((value, index) => {
                    const hasChildren =
                        typeof value !== 'undefined' &&
                        value !== null &&
                        (typeof value === 'object' || Array.isArray(value));
                    const isEmptyObject = hasChildren && !Array.isArray(value) && Object.keys(value).length === 0;
                    const isEmptyArray = hasChildren && Array.isArray(value) && value.length === 0;
                    const stringValue =
                        typeof value === 'string' ? getSingleLineValue(value) : getStringRepresentation(value);
                    const description = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : stringValue;
                    const tooltip = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : getStringRepresentation(value);
                    return <DataNode>{
                        __type: 'dataNode',
                        description,
                        tooltip,
                        index,
                        label: index.toString(),
                        paths: ourNode.paths.concat(index),
                        providerId: ourNode.providerId,
                        type: 'customNodeFromAnotherProvider',
                        msg: ourNode.msg,
                        hasChildren: hasChildren && !isEmptyObject && !isEmptyArray,
                        clipboardText: getTextForClipboard(value)
                    };
                });
            } else if (typeof data === 'object') {
                return Object.keys(data).map((prop) => {
                    const value = (data as any)[prop];
                    const hasChildren =
                        typeof value !== 'undefined' &&
                        value !== null &&
                        (typeof value === 'object' || Array.isArray(value));
                    const isEmptyObject = hasChildren && !Array.isArray(value) && Object.keys(value).length === 0;
                    const isEmptyArray = hasChildren && Array.isArray(value) && value.length === 0;
                    const stringValue =
                        typeof value === 'string' ? getSingleLineValue(value) : getStringRepresentation(value);
                    let description = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : stringValue;
                    let tooltip = isEmptyObject ? '{ }' : isEmptyArray ? '[ ]' : getStringRepresentation(value);
                    if (header.msg_type === 'comm_msg' && value && typeof value === 'object') {
                        if (
                            (currentPath === 'content' && prop === 'data') ||
                            (currentPath === 'content.data' && prop === 'state')
                        ) {
                            try {
                                // Don't attempt to serialize buffer_paths (could contain a lot of info).
                                description = JSON.stringify({ ...value, buffer_paths: [] });
                                tooltip = JSON.stringify({ ...value, buffer_paths: [] }, undefined, 4);
                            } catch {
                                //
                            }
                        }
                    }

                    return <DataNode>{
                        __type: 'dataNode',
                        description,
                        tooltip,
                        property: prop,
                        label: prop,
                        paths: ourNode.paths.concat(prop),
                        providerId: ourNode.providerId,
                        type: 'customNodeFromAnotherProvider',
                        msg: ourNode.msg,
                        hasChildren: hasChildren && !isEmptyObject && !isEmptyArray,
                        clipboardText: getTextForClipboard(value)
                    };
                });
            } else {
                return [];
            }
        }
        return [];
    }
    getTreeItem(node: ICustomNodeFromAnotherProvider): TreeItem {
        const ourNode = node as Node;
        if (ourNode.__type && (ourNode.__type === 'messageNode' || ourNode.__type === 'parentMessageNode')) {
            return new MessageTreeItem(ourNode);
        } else if (ourNode.__type && ourNode.__type === 'dataNode') {
            return new DataTreeItem(ourNode);
        }
        return new MessagesTreeItem(ourNode);
    }
    private getConnectionInfo(connection: Kernel.IKernelConnection) {
        if (!this.messagesByConnection.has(connection)) {
            this.messagesByConnection.set(connection, {
                messages: [],
                requestsById: new Map<string, { parent: MessageNode; children: [] }>()
            });
        }
        return this.messagesByConnection.get(connection)!;
    }

    private addHandler(connection: Session.ISessionConnection, parent?: RootNode) {
        if (connection.kernel && this.connections.has(connection.kernel)) {
            if (parent && !this.connections.get(connection.kernel)) {
                this.connections.set(connection.kernel, parent);
            }
            return;
        }
        if (!connection.kernel) {
            return;
        }
        this.connections.set(connection.kernel, parent);
        const anyHandler = this.onAnyMessageHandler.bind(this, parent);
        connection.kernel.anyMessage.connect(anyHandler, this);
        this.disposables.push(new Disposable(() => connection.kernel!.anyMessage.disconnect(anyHandler)));

        const ioPubHandler = this.onIOPubMessageHandler.bind(this, parent);

        connection.kernel.iopubMessage.connect(ioPubHandler, this);
        this.disposables.push(new Disposable(() => connection.kernel!.iopubMessage.disconnect(ioPubHandler)));

        const unhandledHandler = this.onUnhandledMessageHandler.bind(this, parent);

        connection.kernel.unhandledMessage.connect(unhandledHandler, this);
        this.disposables.push(new Disposable(() => connection.kernel!.unhandledMessage.disconnect(unhandledHandler)));
    }
    private onAnyMessageHandler(
        root: RootNode | undefined,
        connection: Kernel.IKernelConnection,
        args: IAnyMessageArgs
    ) {
        root = root || this.connections.get(connection);
        if (args.direction === 'recv' && args.msg.channel === 'iopub') {
            // These messages are handled by the iopub handler.
            return;
        }
        const { messages, requestsById } = this.getConnectionInfo(connection);
        const label = `${args.msg.channel}.${args.msg.header.msg_type}`;
        const description = args.msg.header.msg_id;
        const parentId = 'msg_id' in args.msg.parent_header ? args.msg.parent_header.msg_id : '';
        const message: MessageNode = {
            __type: 'messageNode',
            direction: args.direction,
            providerId: this.id,
            label,
            description,
            msg_id: args.msg.header.msg_id,
            parent: undefined,
            connection,
            msg: args.msg,
            type: 'customNodeFromAnotherProvider'
        };
        const info = requestsById.get(args.msg.header.msg_id) || requestsById.get(parentId);
        messages.push(message);
        if (info) {
            message.parent = info.parent;
            info.children.push(message);
            this._onDidChangeTreeData.fire(info.parent);
        } else {
            message.isTopLevelMessage = true;
            if (args.direction === 'send' && !requestsById.has(args.msg.header.msg_id)) {
                requestsById.set(args.msg.header.msg_id, { parent: message, children: [{ ...message }] });
                message.__type = 'parentMessageNode';
            }
            if (root) {
                this._onDidChangeTreeData.fire(root);
            }
        }
    }
    private onIOPubMessageHandler(
        root: RootNode | undefined,
        connection: Kernel.IKernelConnection,
        args: IIOPubMessage<IOPubMessageType>
    ) {
        root = root || this.connections.get(connection);
        const { messages, requestsById } = this.getConnectionInfo(connection);
        const label = `${args.channel}.${args.header.msg_type}`;
        const description = args.header.msg_id;
        const parentId = 'msg_id' in args.parent_header ? args.parent_header.msg_id : '';
        const message: MessageNode = {
            __type: 'messageNode',
            direction: 'recv',
            providerId: this.id,
            label,
            description,
            msg_id: args.header.msg_id,
            parent: undefined,
            connection,
            msg: args,
            type: 'customNodeFromAnotherProvider'
        };
        const info = requestsById.get(args.header.msg_id) || requestsById.get(parentId);
        messages.push(message);
        if (info) {
            message.parent = info.parent;
            info.children.push(message);
            this._onDidChangeTreeData.fire(info.parent);
        } else {
            message.isTopLevelMessage = true;
            if (root) {
                this._onDidChangeTreeData.fire(root);
            }
        }
    }
    private onUnhandledMessageHandler(
        root: RootNode | undefined,
        connection: Kernel.IKernelConnection,
        args: IMessage<MessageType>
    ) {
        root = root || this.connections.get(connection);
        const { messages, requestsById } = this.getConnectionInfo(connection);
        const label = `${args.channel}.${args.header.msg_type}`;
        const description = args.header.msg_id;
        const parentId = 'msg_id' in args.parent_header ? args.parent_header.msg_id : '';
        const message: MessageNode = {
            __type: 'messageNode',
            direction: 'recv',
            providerId: this.id,
            label,
            description,
            msg_id: args.header.msg_id,
            parent: undefined,
            connection,
            msg: args,
            type: 'customNodeFromAnotherProvider'
        };
        const info = requestsById.get(args.header.msg_id) || requestsById.get(parentId);
        messages.push(message);
        if (info) {
            message.parent = info.parent;
            info.children.push(message);
            this._onDidChangeTreeData.fire(info.parent);
        } else {
            message.isTopLevelMessage = true;
            if (root) {
                this._onDidChangeTreeData.fire(root);
            }
        }
    }
}
