import { ConfigManager } from "./config";
import { logger } from "./logger";

export class HTTPManager {
    static urlMap: { [key: string]: { url: string, token: string } } = {};
    static initDone: boolean = false;

    static async init() {
        this.urlMap = {};

        const urls = ConfigManager.httpUrl;
        const tokens = ConfigManager.httpToken;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const token = tokens[i] || '';
            const fetchUrl = `${url}/get_login_info`;

            const data = await this.fetchData(fetchUrl, token);
            if (data === null) {
                logger.error(`获取登录信息失败: ${fetchUrl}`);
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

                    logger.info(`找到 ${epId} 地址: ${url} `);
                    found = true;
                    break;
                }
            }

            if (!found) {
                logger.warning(`未找到对应的端点: ${epId}`);
            }
        }

        logger.info('HTTP 初始化完成，http urlMap: ', JSON.stringify(this.urlMap, null, 2));
        this.initDone = true;
    }

    static async fetchData(url: string, token: string = '', data: any = null) {
        try {
            const headers = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const options = {
                method: data === null ? 'GET' : 'POST',
                headers: headers,
                body: data ? JSON.stringify(data) : null
            };

            const response = await fetch(url, options);
            const text = await response.text();

            if (!response.ok) {
                throw new Error(`请求失败! 状态码: ${response.status}\n响应体: ${text}`);
            }
            if (!text) {
                logger.info('响应体为空，但请求成功');
                return {};
            }

            try {
                const responseData = JSON.parse(text);
                logger.info(`获取数据成功: ${JSON.stringify(responseData.data, null, 2)}`);
                return responseData.data;
            } catch (e) {
                throw new Error(`解析响应体时出错:${e}\n响应体:${text}`);
            }
        } catch (error) {
            logger.error(`获取数据失败: ${error.message}`);
            return null;
        }
    }
}