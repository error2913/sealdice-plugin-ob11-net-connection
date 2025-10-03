import { HTTPManager } from "./http";
import { logger } from "./logger";
import { WSManager } from "./ws";

export class NetworkClient {
    static async init() {
        HTTPManager.init();
        WSManager.init();
    }

    /** 兼容旧版本HTTP依赖 */
    static async getData(epId: string, val: string, data: any = null) {
        return await this.callApi(epId, val, data);
    }

    /**
     * 调用网络API（统一接口）
     * @param {string} epId 骰子的QQ号，格式如 QQ:12345
     * @param {string} method 调用的方法名，如 get_login_info
     * @param {any} data 调用的方法的参数，默认为null
     * @returns {Promise<any>} 返回API调用结果
     */
    static async callApi(epId: string, method: string, data: any = null): Promise<any> {
        // 兼容http get调用写法
        if (method.indexOf("?") !== -1) {
            const parts = method.split("?");
            method = parts[0];
            const query = parts[1];
            const queryParams = {};

            const pairs = query.split("&");
            for (let i = 0; i < pairs.length; i++) {
                const kv = pairs[i].split("=");
                const key = kv[0];
                const value = kv.length > 1 ? kv[1] : "";
                queryParams[key] = value;
            }

            if (data === null) {
                data = queryParams;
            } else {
                for (let k in queryParams) {
                    data[k] = queryParams[k];
                }
            }
        }

        if (!HTTPManager.initDone) {
            await HTTPManager.init();
        }
        if (!WSManager.initDone) {
            await WSManager.init();
        }

        if (!HTTPManager.urlMap.hasOwnProperty(epId) && !WSManager.urlMap.hasOwnProperty(epId)) {
            logger.error(`未找到网络地址: ${epId}，请检查配置`);
            logger.info(`当前可用的端点: ${Object.keys(HTTPManager.urlMap).concat(Object.keys(WSManager.urlMap)).join(', ')}`);
            throw new Error(`未找到网络地址: ${epId}，请检查配置`);
        }


        try {
            if (HTTPManager.urlMap.hasOwnProperty(epId)) {
                const { url, token } = HTTPManager.urlMap[epId];
                logger.info(`请求地址: ${url}，请求方法: ${method}，请求参数: ${JSON.stringify(data)}`);
                return await HTTPManager.fetchData(`${url}/${method}`, token, data);
            } else {
                const { url } = WSManager.urlMap[epId];
                logger.info(`请求地址: ${url}，请求方法: ${method}，请求参数: ${JSON.stringify(data)}`);
                return await WSManager.callWebSocketApi(epId, method, data || {});
            }
        } catch (error) {
            logger.error(`网络API调用失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 发送群消息的便捷方法
     */
    static async sendGroupMsg(epId, groupId, message) {
        return await this.callApi(epId, 'send_group_msg', {
            group_id: groupId,
            message: message
        });
    }

    /**
     * 发送私聊消息的便捷方法
     */
    static async sendPrivateMsg(epId, userId, message) {
        return await this.callApi(epId, 'send_private_msg', {
            user_id: userId,
            message: message
        });
    }

    /**
     * 禁言群成员的便捷方法
     */
    static async setGroupBan(epId, groupId, userId, duration) {
        return await this.callApi(epId, 'set_group_ban', {
            group_id: groupId,
            user_id: userId,
            duration: duration
        });
    }

    /**
     * 踢出群成员的便捷方法
     */
    static async setGroupKick(epId, groupId, userId, rejectAddRequest = false) {
        return await this.callApi(epId, 'set_group_kick', {
            group_id: groupId,
            user_id: userId,
            reject_add_request: rejectAddRequest
        });
    }

    /**
     * 获取群成员信息的便捷方法
     */
    static async getGroupMemberInfo(epId, groupId, userId, noCache = false) {
        return await this.callApi(epId, 'get_group_member_info', {
            group_id: groupId,
            user_id: userId,
            no_cache: noCache
        });
    }

    /**
     * 获取群信息的便捷方法
     */
    static async getGroupInfo(epId, groupId, noCache = false) {
        return await this.callApi(epId, 'get_group_info', {
            group_id: groupId,
            no_cache: noCache
        });
    }
}