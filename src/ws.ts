import { ConfigManager } from "./config";
import { logger } from "./logger";

export interface ConnectionInfo {
    ws: WebSocket,
    url: string,
    token: string,
    connected: boolean,
    apiCallbacks: Map<string, { resolve: (data: any) => void, reject: (error: Error) => void }>
};

export class WS {
    name: string;
    onEvent: (epId: string, event: OneBot11.Event) => void;
    onMessageEvent: (epId: string, event: OneBot11.MessageEvent) => void;
    onNoticeEvent: (epId: string, event: OneBot11.NoticeEvent) => void;
    onRequestEvent: (epId: string, event: OneBot11.RequestEvent) => void;
    onMetaEvent: (epId: string, event: OneBot11.MetaEvent) => void;

    constructor(ext: seal.ExtInfo) {
        this.name = ext.name;
        this.onEvent = () => { };
        this.onMessageEvent = () => { };
        this.onNoticeEvent = () => { };
        this.onRequestEvent = () => { };
        this.onMetaEvent = () => { };
    }
}

export class WSManager {
    static urlMap: { [key: string]: { url: string, token: string } } = {};
    static initDone: boolean = false;

    static wsConnections: { [key: string]: ConnectionInfo } = {};
    static wsMap: { [key: string]: WS } = {};

    static async getWs(ext: seal.ExtInfo): Promise<WS> {
        if (!this.initDone) {
            await this.init();
        }
        return this.wsMap[ext.name] || (this.wsMap[ext.name] = new WS(ext));
    }

    // --- 事件分发 ---//
    static emitEvent(epId: string, event: OneBot11.Event) {
        for (const name of Object.keys(this.wsMap)) {
            const ws = this.wsMap[name];

            try { ws.onEvent(epId, event); } catch (e) { logger.error(`[${name}] 事件处理错误: ${e.message}`); }
            switch (event.post_type) {
                case 'message': {
                    try { ws.onMessageEvent(epId, event as OneBot11.MessageEvent); } catch (e) { logger.error(`[${name}] message事件处理错误: ${e.message}`); }
                    break;
                }
                case 'notice': {
                    try { ws.onNoticeEvent(epId, event as OneBot11.NoticeEvent); } catch (e) { logger.error(`[${name}] notice事件处理错误: ${e.message}`); }
                    break;
                }
                case 'request': {
                    try { ws.onRequestEvent(epId, event as OneBot11.RequestEvent); } catch (e) { logger.error(`[${name}] request事件处理错误: ${e.message}`); }
                    break;
                }
                case 'meta_event': {
                    try { ws.onMetaEvent(epId, event as OneBot11.MetaEvent); } catch (e) { logger.error(`[${name}] meta_event事件处理错误: ${e.message}`); }
                    break;
                }
            }
        }
    }

    static async init() {
        this.urlMap = {};

        Object.keys(this.wsConnections).forEach(epId => {
            if (this.wsConnections[epId]) {
                this.wsConnections[epId].ws.close();
                delete this.wsConnections[epId];
            }
        });

        const urls = ConfigManager.wsUrl;
        const tokens = ConfigManager.wsToken;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const token = tokens[i] || '';

            try {
                logger.info(`尝试连接: ${url}`);

                const tempWs = new WebSocket(token ?
                    `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` :
                    url
                );

                const data: any = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        tempWs.close();
                        reject(new Error('WebSocket连接超时'));
                    }, 5000);

                    tempWs.onopen = function () {
                        const requestData = {
                            action: 'get_login_info',
                            params: {},
                            echo: 'init_test'
                        };
                        tempWs.send(JSON.stringify(requestData));
                    };

                    tempWs.onmessage = function (event) {
                        try {
                            const response = JSON.parse(event.data);
                            if (response.echo === 'init_test' && response.status === 'ok') {
                                clearTimeout(timeout);
                                tempWs.close();
                                resolve(response.data);
                            }
                        } catch (e) {
                        }
                    };

                    tempWs.onerror = function (event) {
                        clearTimeout(timeout);
                        tempWs.close();
                        reject(new Error(`WebSocket连接错误: ${JSON.stringify(event)}`));
                    };
                });

                if (data === null || data === undefined) {
                    logger.error(`获取登录信息失败: ${url}`);
                    continue;
                }

                const epId = `QQ:${data.user_id}`;
                const eps = seal.getEndPoints();
                let found = false;

                for (let j = 0; j < eps.length; j++) {
                    if (eps[j].userId === epId) {
                        this.urlMap[epId] = {
                            url: url,
                            token: token
                        };

                        this.createWebSocketConnection(epId, url, token);
                        logger.info(`找到 ${epId} 地址: ${url} `);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    logger.warning(`未找到对应的端点: ${epId}`);
                }
            } catch (error) {
                logger.error(`获取登录信息失败: ${url}, 错误: ${error.message}`);
                continue;
            }
        }

        logger.info('WS 初始化完成，ws urlMap: ', JSON.stringify(this.urlMap, null, 2));
        this.initDone = true;
    }

    /**
     * 获取事件的简要描述信息，便于日志记录和调试
     * @param {OneBot11.Event} event OneBot 11 标准事件对象
     * @returns {string} 返回格式化后的事件描述字符串，内容根据事件类型自动拼接
     */
    static getEventDescription(event: OneBot11.Event): string {
        const { post_type, time, self_id } = event;
        let eventDesc = `时间:${new Date(time * 1000).toLocaleString()}, 机器人:${self_id}, 事件类型:${post_type}`;

        switch (post_type) {
            case 'message': {
                const messageEvent = event as OneBot11.MessageEvent;
                const subType = messageEvent.message_type;
                eventDesc += `.${subType}`;
                if (subType === 'group') {
                    eventDesc += ` (群:${messageEvent.group_id}, 用户:${messageEvent.user_id})`;
                } else if (subType === 'private') {
                    eventDesc += ` (用户:${messageEvent.user_id})`;
                }
                if (ConfigManager.logLevel === "详细") {
                    let msgContent = messageEvent.message;
                    if (typeof msgContent === 'object') {
                        try {
                            msgContent = JSON.stringify(msgContent);
                        } catch (e) {
                            msgContent = '[无法解析的消息对象]';
                        }
                    }
                    eventDesc += ` 消息:${msgContent}`;
                }
                break;
            }
            case 'notice': {
                const noticeEvent = event as OneBot11.NoticeEvent;
                const noticeType = noticeEvent.notice_type;
                eventDesc += `.${noticeType}`;
                if (noticeType === 'group_upload') {
                    eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 文件:${noticeEvent.file?.name || '未知'})`;
                } else if (noticeType === 'group_admin') {
                    eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 操作:${noticeEvent.sub_type})`;
                } else if (noticeType === 'group_decrease' || noticeType === 'group_increase') {
                    eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 操作:${noticeEvent.sub_type})`;
                } else if (noticeType === 'group_ban') {
                    eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 时长:${noticeEvent.duration}s)`;
                } else if (noticeType === 'friend_add') {
                    eventDesc += ` (用户:${noticeEvent.user_id})`;
                } else if (noticeType === 'group_recall') {
                    eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 消息ID:${noticeEvent.message_id})`;
                } else if (noticeType === 'friend_recall') {
                    eventDesc += ` (用户:${noticeEvent.user_id}, 消息ID:${noticeEvent.message_id})`;
                } else if (noticeType === 'notify') {
                    eventDesc += `.${noticeEvent.sub_type}`;
                    if (noticeEvent.sub_type === 'poke') {
                        eventDesc += ` (群:${(noticeEvent as OneBot11.PokeNotifyEvent).group_id || '私聊'}, 戳一戳:${(noticeEvent as OneBot11.PokeNotifyEvent).user_id}->${(noticeEvent as OneBot11.PokeNotifyEvent).target_id})`;
                    } else if (noticeEvent.sub_type === 'lucky_king') {
                        eventDesc += ` (群:${(noticeEvent as OneBot11.LuckyKingNotifyEvent).group_id}, 红包王:${(noticeEvent as OneBot11.LuckyKingNotifyEvent).target_id})`;
                    } else if (noticeEvent.sub_type === 'honor') {
                        eventDesc += ` (群:${(noticeEvent as OneBot11.HonorNotifyEvent).group_id}, 群荣誉:${(noticeEvent as OneBot11.HonorNotifyEvent).honor_type}, 用户:${(noticeEvent as OneBot11.HonorNotifyEvent).user_id})`;
                    }
                }
                break;
            }
            case 'request': {
                const requestEvent = event as OneBot11.RequestEvent;
                const requestType = requestEvent.request_type;
                eventDesc += `.${requestType}`;
                if (requestType === 'friend') {
                    eventDesc += ` (用户:${requestEvent.user_id}, 验证消息:"${requestEvent.comment}")`;
                } else if (requestType === 'group') {
                    eventDesc += `.${requestEvent.sub_type} (群:${requestEvent.group_id}, 用户:${requestEvent.user_id}, 消息:"${requestEvent.comment}")`;
                }
                break;
            }
            case 'meta_event': {
                const metaEvent = event as OneBot11.MetaEvent;
                const metaType = metaEvent.meta_event_type;
                eventDesc += `.${metaType}`;
                if (metaType === 'lifecycle') {
                    eventDesc += ` (子类型:${metaEvent.sub_type})`;
                } else if (metaType === 'heartbeat') {
                    eventDesc += ` (状态:${JSON.stringify(metaEvent.status)})`;
                }
                break;
            }
            default: {
                eventDesc += ' (未知事件类型)';
            }
        }

        return eventDesc;
    }

    static handleEvent(epId: string, event: OneBot11.Event) {
        if (ConfigManager.eventLevel === "忽略") return;
        if (ConfigManager.eventLevel === "记录") {
            const eventDesc = this.getEventDescription(event);
            logger.info(`[${epId}] 收到事件: ${eventDesc}`);

            if (ConfigManager.logLevel === "详细") {
                logger.info(`[${epId}] 完整事件数据: ${JSON.stringify(event, null, 2)}`);
            }
        }

        this.emitEvent(epId, event);
    }

    /**
     * 创建一个 WebSocket 连接并管理其生命周期。
     * @param {string} epId   端点ID
     * @param {string} wsUrl  WebSocket 服务端地址
     * @param {string} token  Access Token
     * @returns {object}      返回连接信息对象
     */
    static createWebSocketConnection(epId: string, wsUrl: string, token: string = ''): object {
        if (this.wsConnections[epId]) {
            logger.info(`${epId} 的WebSocket连接已存在，先关闭旧连接`);
            this.wsConnections[epId].ws.close();
            delete this.wsConnections[epId];
        }

        let connectionUrl = wsUrl;
        if (token) {
            const separator = wsUrl.includes('?') ? '&' : '?';
            connectionUrl = `${wsUrl}${separator}access_token=${encodeURIComponent(token)}`;
        }

        const ws = new WebSocket(connectionUrl);
        const connectionInfo = {
            ws: ws,
            url: wsUrl,
            token: token,
            connected: false,
            apiCallbacks: new Map()
        };

        ws.onopen = function () {
            connectionInfo.connected = true;
            logger.info(`[${epId}] WebSocket连接成功: ${connectionUrl.replace(/access_token=[^&]*/, 'access_token=***')}`);
        };

        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                if (data.hasOwnProperty('echo') && connectionInfo.apiCallbacks.has(data.echo)) {
                    const callback = connectionInfo.apiCallbacks.get(data.echo);
                    connectionInfo.apiCallbacks.delete(data.echo);

                    if (data.status === 'ok') {
                        callback.resolve(data.data);
                    } else {
                        callback.reject(new Error(`API调用失败: ${data.message || data.wording || '未知错误'}`));
                    }
                }

                else if (data.hasOwnProperty('post_type')) {
                    WSManager.handleEvent(epId, data);
                }

                else if (data.hasOwnProperty('status')) {
                    logger.info(`[${epId}] 收到无echo的API响应: ${JSON.stringify(data)}`);
                } else {
                    logger.warning(`[${epId}] 收到未知格式消息: ${JSON.stringify(data)}`);
                }
            } catch (e) {
                logger.error(`[${epId}] 解析WebSocket消息失败: ${e.message}`);
            }
        };

        ws.onerror = function (event) {
            logger.error(`[${epId}] WebSocket错误:`, JSON.stringify(event));
            connectionInfo.connected = false;
        };

        ws.onclose = function (event) {
            connectionInfo.connected = false;
            if (event.code !== 1000) {
                logger.warning(`[${epId}] WebSocket异常关闭: ${event.code} ${event.reason}`);
            } else {
                logger.info(`[${epId}] WebSocket正常关闭`);
            }

            connectionInfo.apiCallbacks.forEach(callback => {
                callback.reject(new Error('WebSocket连接已关闭'));
            });
            connectionInfo.apiCallbacks.clear();
        };

        this.wsConnections[epId] = connectionInfo;
        return connectionInfo;
    }

    /**
     * 通过WebSocket调用OneBot 11 API。
     * @param {string} epId   端点ID（格式如 QQ:12345）
     * @param {string} action API方法名
     * @param {object} params API参数对象
     * @returns {Promise<object>} 返回API响应的data字段
     */
    static async callWebSocketApi(epId: string, action: string, params: object = {}): Promise<object> {
        const connectionInfo = this.wsConnections[epId];
        if (!connectionInfo || !connectionInfo.connected) {
            throw new Error(`WebSocket连接未建立或已断开: ${epId}`);
        }

        return new Promise((resolve, reject) => {
            const echo = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            connectionInfo.apiCallbacks.set(echo, { resolve, reject });

            const requestData = {
                action: action,
                params: params,
                echo: echo
            };

            logger.info(`[${epId}] WebSocket发送API请求: ${JSON.stringify(requestData)}`);
            connectionInfo.ws.send(JSON.stringify(requestData));

            setTimeout(() => {
                if (connectionInfo.apiCallbacks.has(echo)) {
                    connectionInfo.apiCallbacks.delete(echo);
                    reject(new Error('API调用超时'));
                }
            }, 10000);
        });
    }


    /**
     * 关闭WebSocket连接
     * @param {string} epId 骰子的QQ号，如果不提供则关闭所有连接
     */
    static closeWebSocket(epId: string) {
        if (epId) {
            if (this.wsConnections[epId]) {
                this.wsConnections[epId].ws.close();
                delete this.wsConnections[epId];
                logger.info(`已关闭 ${epId} 的WebSocket连接`);
                return 1;
            } else {
                logger.warning(`${epId} 没有WebSocket连接`);
                return 0;
            }
        } else {
            let count = 0;
            Object.keys(this.wsConnections).forEach(id => {
                this.wsConnections[id].ws.close();
                delete this.wsConnections[id];
                count++;
            });
            logger.info(`已关闭 ${count} 个WebSocket连接`);
            return count;
        }
    }

    /**
     * 获取WebSocket连接状态
     */
    static getWebSocketStatus() {
        const status = {};
        Object.keys(this.wsConnections).forEach(epId => {
            const conn = this.wsConnections[epId];
            status[epId] = {
                connected: conn.connected,
                url: conn.url,
                readyState: conn.ws.readyState
            };
        });
        return status;
    }
}