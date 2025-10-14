// ==UserScript==
// @name         ob11网络连接依赖
// @author       错误&白鱼
// @version      2.0.0
// @description  为插件提供统一的ob11网络连接依赖管理，支持HTTP和WebSocket。\n地址请按照自己的登录方案自行配置，支持http和ws协议，支持多个账号。\nWebSocket会保持持久连接并接收事件推送。\n提供指令 .net 可以直接调用\n在其他插件中使用方法: globalThis.net.callApi(epId, method, data=null)\nepId为骰子账号QQ:12345，method为方法，如get_login_info，data为参数。\n方法可参见https://github.com/botuniverse/onebot-11/blob/master/api/public.md#%E5%85%AC%E5%BC%80-api
// @timestamp    1755278205
// @license      MIT
// @homepageURL  https://github.com/error2913/sealdice-plugin-ob11-net-connection/
// @updateUrl    https://raw.gitmirror.com/error2913/sealdice-plugin-ob11-net-connection/main/dist/ob11网络连接依赖.js
// @updateUrl    https://raw.githubusercontent.com/error2913/sealdice-plugin-ob11-net-connection/main/dist/ob11网络连接依赖.js
// ==/UserScript==
(() => {
  // src/config.ts
  var VERSION = "2.0.0";
  var AUTHOR = "错误&白鱼";
  var NAME = "ob11网络连接依赖";
  var _ConfigManager = class _ConfigManager {
    static registerConfig() {
      this.ext = _ConfigManager.getExt(NAME);
      seal.ext.registerTemplateConfig(this.ext, "HTTP地址", ["http://127.0.0.1:8091"], "修改后保存并重新初始化");
      seal.ext.registerTemplateConfig(this.ext, "HTTP Access Token", [""], "在这里填入你的Access Token，与上面的地址一一对应，如果没有则留空");
      seal.ext.registerTemplateConfig(this.ext, "WS地址", ["ws://127.0.0.1:8081"], "修改后保存并重新初始化");
      seal.ext.registerTemplateConfig(this.ext, "WS Access Token", [""], "在这里填入你的Access Token，与上面的地址一一对应，如果没有则留空");
      seal.ext.registerOptionConfig(this.ext, "日志打印方式", "简短", ["永不", "简短", "详细"], "");
      seal.ext.registerOptionConfig(this.ext, "事件处理", "记录", ["忽略", "记录"], "设置对WebSocket事件的处理方式");
    }
    static getCache(key, getFunc) {
      var _a;
      const timestamp = Date.now();
      if (((_a = this.cache) == null ? void 0 : _a[key]) && timestamp - this.cache[key].timestamp < 3e3) {
        return this.cache[key].data;
      }
      const data = getFunc();
      this.cache[key] = {
        timestamp,
        data
      };
      return data;
    }
    static get httpUrl() {
      return this.getCache("httpUrl", () => seal.ext.getTemplateConfig(this.ext, "HTTP地址"));
    }
    static get httpToken() {
      return this.getCache("httpToken", () => seal.ext.getTemplateConfig(this.ext, "HTTP Access Token"));
    }
    static get wsUrl() {
      return this.getCache("wsUrl", () => seal.ext.getTemplateConfig(this.ext, "WS地址"));
    }
    static get wsToken() {
      return this.getCache("wsToken", () => seal.ext.getTemplateConfig(this.ext, "WS Access Token"));
    }
    static get logLevel() {
      return this.getCache("logLevel", () => seal.ext.getOptionConfig(this.ext, "日志打印方式"));
    }
    static get eventLevel() {
      return this.getCache("eventLevel", () => seal.ext.getOptionConfig(this.ext, "事件处理"));
    }
    static getExt(name) {
      if (name == NAME && _ConfigManager.ext) {
        return _ConfigManager.ext;
      }
      let ext = seal.ext.find(name);
      if (!ext) {
        ext = seal.ext.new(name, AUTHOR, VERSION);
        seal.ext.register(ext);
      }
      return ext;
    }
  };
  _ConfigManager.cache = {};
  var ConfigManager = _ConfigManager;

  // src/logger.ts
  var Logger = class {
    constructor(name) {
      this.name = name;
    }
    handleLog(...data) {
      const logLevel = ConfigManager.logLevel;
      if (logLevel === "永不") {
        return "";
      } else if (logLevel === "简短") {
        const s = data.map((item) => `${item}`).join(" ");
        if (s.length > 1e3) {
          return s.substring(0, 500) + "\n...\n" + s.substring(s.length - 500);
        } else {
          return s;
        }
      } else if (logLevel === "详细") {
        return data.map((item) => `${item}`).join(" ");
      } else {
        return "";
      }
    }
    info(...data) {
      const s = this.handleLog(...data);
      if (!s) {
        return;
      }
      console.log(`【${this.name}】: ${s}`);
    }
    warning(...data) {
      const s = this.handleLog(...data);
      if (!s) {
        return;
      }
      console.warn(`【${this.name}】: ${s}`);
    }
    error(...data) {
      const s = this.handleLog(...data);
      if (!s) {
        return;
      }
      console.error(`【${this.name}】: ${s}`);
    }
  };
  var logger = new Logger(NAME);

  // src/http.ts
  var HTTPManager = class {
    static async init() {
      this.urlMap = {};
      const urls = ConfigManager.httpUrl;
      const tokens = ConfigManager.httpToken;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const token = tokens[i] || "";
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
              url,
              token
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
      logger.info("HTTP 初始化完成，http urlMap: ", JSON.stringify(this.urlMap, null, 2));
      this.initDone = true;
    }
    static async fetchData(url, token = "", data = null) {
      try {
        const headers = {
          "Content-Type": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const options = {
          method: data === null ? "GET" : "POST",
          headers,
          body: data ? JSON.stringify(data) : null
        };
        const response = await fetch(url, options);
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`请求失败! 状态码: ${response.status}
响应体: ${text}`);
        }
        if (!text) {
          logger.info("响应体为空，但请求成功");
          return {};
        }
        try {
          const responseData = JSON.parse(text);
          logger.info(`获取数据成功: ${JSON.stringify(responseData.data, null, 2)}`);
          return responseData.data;
        } catch (e) {
          throw new Error(`解析响应体时出错:${e}
响应体:${text}`);
        }
      } catch (error) {
        logger.error(`获取数据失败: ${error.message}`);
        return null;
      }
    }
  };
  HTTPManager.urlMap = {};
  HTTPManager.initDone = false;

  // src/ws.ts
  var WS = class {
    constructor(ext) {
      this.name = ext.name;
      this.onEvent = () => {
      };
      this.onMessageEvent = () => {
      };
      this.onNoticeEvent = () => {
      };
      this.onRequestEvent = () => {
      };
      this.onMetaEvent = () => {
      };
    }
  };
  var _WSManager = class _WSManager {
    static async getWs(ext) {
      if (!this.initDone) {
        await this.init();
      }
      return this.wsMap[ext.name] || (this.wsMap[ext.name] = new WS(ext));
    }
    // --- 事件分发 ---//
    static emitEvent(epId, event) {
      for (const name of Object.keys(this.wsMap)) {
        const ws = this.wsMap[name];
        try {
          ws.onEvent(epId, event);
        } catch (e) {
          logger.error(`[${name}] 事件处理错误: ${e.message}`);
        }
        switch (event.post_type) {
          case "message": {
            try {
              ws.onMessageEvent(epId, event);
            } catch (e) {
              logger.error(`[${name}] message事件处理错误: ${e.message}`);
            }
            break;
          }
          case "notice": {
            try {
              ws.onNoticeEvent(epId, event);
            } catch (e) {
              logger.error(`[${name}] notice事件处理错误: ${e.message}`);
            }
            break;
          }
          case "request": {
            try {
              ws.onRequestEvent(epId, event);
            } catch (e) {
              logger.error(`[${name}] request事件处理错误: ${e.message}`);
            }
            break;
          }
          case "meta_event": {
            try {
              ws.onMetaEvent(epId, event);
            } catch (e) {
              logger.error(`[${name}] meta_event事件处理错误: ${e.message}`);
            }
            break;
          }
        }
      }
    }
    static async init() {
      this.urlMap = {};
      Object.keys(this.wsConnections).forEach((epId) => {
        if (this.wsConnections[epId]) {
          this.wsConnections[epId].ws.close();
          delete this.wsConnections[epId];
        }
      });
      const urls = ConfigManager.wsUrl;
      const tokens = ConfigManager.wsToken;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const token = tokens[i] || "";
        try {
          logger.info(`尝试连接: ${url}`);
          const tempWs = new WebSocket(
            token ? `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}` : url
          );
          const data = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              tempWs.close();
              reject(new Error("WebSocket连接超时"));
            }, 5e3);
            tempWs.onopen = function() {
              const requestData = {
                action: "get_login_info",
                params: {},
                echo: "init_test"
              };
              tempWs.send(JSON.stringify(requestData));
            };
            tempWs.onmessage = function(event) {
              try {
                const response = JSON.parse(event.data);
                if (response.echo === "init_test" && response.status === "ok") {
                  clearTimeout(timeout);
                  tempWs.close();
                  resolve(response.data);
                }
              } catch (e) {
              }
            };
            tempWs.onerror = function(event) {
              clearTimeout(timeout);
              tempWs.close();
              reject(new Error(`WebSocket连接错误: ${JSON.stringify(event)}`));
            };
          });
          if (data === null || data === void 0) {
            logger.error(`获取登录信息失败: ${url}`);
            continue;
          }
          const epId = `QQ:${data.user_id}`;
          const eps = seal.getEndPoints();
          let found = false;
          for (let j = 0; j < eps.length; j++) {
            if (eps[j].userId === epId) {
              this.urlMap[epId] = {
                url,
                token
              };
              this.createWsConnection(epId, url, token);
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
      logger.info("WS 初始化完成，ws urlMap: ", JSON.stringify(this.urlMap, null, 2));
      this.initDone = true;
    }
    /**
     * 获取事件的简要描述信息，便于日志记录和调试
     * @param {OneBot11.Event} event OneBot 11 标准事件对象
     * @returns {string} 返回格式化后的事件描述字符串，内容根据事件类型自动拼接
     */
    static getEventDescription(event) {
      var _a;
      const { post_type, time, self_id } = event;
      let eventDesc = `时间:${new Date(time * 1e3).toLocaleString()}, 机器人:${self_id}, 事件类型:${post_type}`;
      switch (post_type) {
        case "message": {
          const messageEvent = event;
          const subType = messageEvent.message_type;
          eventDesc += `.${subType}`;
          if (subType === "group") {
            eventDesc += ` (群:${messageEvent.group_id}, 用户:${messageEvent.user_id})`;
          } else if (subType === "private") {
            eventDesc += ` (用户:${messageEvent.user_id})`;
          }
          if (ConfigManager.logLevel === "详细") {
            let msgContent = messageEvent.message;
            if (typeof msgContent === "object") {
              try {
                msgContent = JSON.stringify(msgContent);
              } catch (e) {
                msgContent = "[无法解析的消息对象]";
              }
            }
            eventDesc += ` 消息:${msgContent}`;
          }
          break;
        }
        case "notice": {
          const noticeEvent = event;
          const noticeType = noticeEvent.notice_type;
          eventDesc += `.${noticeType}`;
          if (noticeType === "group_upload") {
            eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 文件:${((_a = noticeEvent.file) == null ? void 0 : _a.name) || "未知"})`;
          } else if (noticeType === "group_admin") {
            eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 操作:${noticeEvent.sub_type})`;
          } else if (noticeType === "group_decrease" || noticeType === "group_increase") {
            eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 操作:${noticeEvent.sub_type})`;
          } else if (noticeType === "group_ban") {
            eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 时长:${noticeEvent.duration}s)`;
          } else if (noticeType === "friend_add") {
            eventDesc += ` (用户:${noticeEvent.user_id})`;
          } else if (noticeType === "group_recall") {
            eventDesc += ` (群:${noticeEvent.group_id}, 用户:${noticeEvent.user_id}, 消息ID:${noticeEvent.message_id})`;
          } else if (noticeType === "friend_recall") {
            eventDesc += ` (用户:${noticeEvent.user_id}, 消息ID:${noticeEvent.message_id})`;
          } else if (noticeType === "notify") {
            eventDesc += `.${noticeEvent.sub_type}`;
            if (noticeEvent.sub_type === "poke") {
              eventDesc += ` (群:${noticeEvent.group_id || "私聊"}, 戳一戳:${noticeEvent.user_id}->${noticeEvent.target_id})`;
            } else if (noticeEvent.sub_type === "lucky_king") {
              eventDesc += ` (群:${noticeEvent.group_id}, 红包王:${noticeEvent.target_id})`;
            } else if (noticeEvent.sub_type === "honor") {
              eventDesc += ` (群:${noticeEvent.group_id}, 群荣誉:${noticeEvent.honor_type}, 用户:${noticeEvent.user_id})`;
            }
          }
          break;
        }
        case "request": {
          const requestEvent = event;
          const requestType = requestEvent.request_type;
          eventDesc += `.${requestType}`;
          if (requestType === "friend") {
            eventDesc += ` (用户:${requestEvent.user_id}, 验证消息:"${requestEvent.comment}")`;
          } else if (requestType === "group") {
            eventDesc += `.${requestEvent.sub_type} (群:${requestEvent.group_id}, 用户:${requestEvent.user_id}, 消息:"${requestEvent.comment}")`;
          }
          break;
        }
        case "meta_event": {
          const metaEvent = event;
          const metaType = metaEvent.meta_event_type;
          eventDesc += `.${metaType}`;
          if (metaType === "lifecycle") {
            eventDesc += ` (子类型:${metaEvent.sub_type})`;
          } else if (metaType === "heartbeat") {
            eventDesc += ` (状态:${JSON.stringify(metaEvent.status)})`;
          }
          break;
        }
        default: {
          eventDesc += " (未知事件类型)";
        }
      }
      return eventDesc;
    }
    static handleEvent(epId, event) {
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
    static createWsConnection(epId, wsUrl, token = "") {
      if (this.wsConnections[epId]) {
        logger.info(`${epId} 的WebSocket连接已存在，先关闭旧连接`);
        this.wsConnections[epId].ws.close();
        delete this.wsConnections[epId];
      }
      let connectionUrl = wsUrl;
      if (token) {
        const separator = wsUrl.includes("?") ? "&" : "?";
        connectionUrl = `${wsUrl}${separator}access_token=${encodeURIComponent(token)}`;
      }
      const ws = new WebSocket(connectionUrl);
      const ci = {
        ws,
        url: wsUrl,
        token,
        connected: false,
        apiCallbacks: /* @__PURE__ */ new Map()
      };
      ws.onopen = function() {
        ci.connected = true;
        logger.info(`[${epId}] WebSocket连接成功: ${connectionUrl.replace(/access_token=[^&]*/, "access_token=***")}`);
      };
      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.hasOwnProperty("echo") && ci.apiCallbacks.has(data.echo)) {
            const callback = ci.apiCallbacks.get(data.echo);
            ci.apiCallbacks.delete(data.echo);
            if (!callback) {
              logger.warning(`[${epId}] 收到响应但找不到对应的回调: ${data.echo}`);
              return;
            }
            try {
              if (data.status === "ok") {
                callback.resolve(data.data || {});
              } else {
                callback.reject(new Error(`API调用失败: ${data.message || data.wording || "未知错误"}`));
              }
            } catch (error) {
              logger.error(`[${epId}] 处理回调时发生错误:`, error);
            }
          } else if (data.hasOwnProperty("post_type")) {
            _WSManager.handleEvent(epId, data);
          } else if (data.hasOwnProperty("status")) {
            logger.info(`[${epId}] 收到无echo的API响应: ${JSON.stringify(data)}`);
          } else {
            logger.warning(`[${epId}] 收到未知格式消息: ${JSON.stringify(data)}`);
          }
        } catch (e) {
          logger.error(`[${epId}] 解析WebSocket消息失败: ${e.message}`);
        }
      };
      ws.onerror = function(event) {
        logger.error(`[${epId}] WebSocket错误:`, JSON.stringify(event));
        ci.connected = false;
      };
      ws.onclose = function(event) {
        ci.connected = false;
        if (event.code !== 1e3) {
          logger.warning(`[${epId}] WebSocket异常关闭: ${event.code} ${event.reason}`);
        } else {
          logger.info(`[${epId}] WebSocket正常关闭`);
        }
        ci.apiCallbacks.forEach((callback) => {
          callback.reject(new Error("WebSocket连接已关闭"));
        });
        ci.apiCallbacks.clear();
      };
      this.wsConnections[epId] = ci;
      return ci;
    }
    /**
     * 通过WebSocket调用OneBot 11 API。
     * @param {string} epId   端点ID（格式如 QQ:12345）
     * @param {string} action API方法名
     * @param {object} params API参数对象
     * @returns {Promise<object>} 返回API响应的data字段
     */
    static async callApiByWs(epId, action, params = {}) {
      const ci = this.wsConnections[epId];
      if (!ci || !ci.connected || ci.ws.readyState !== Number(WebSocket.OPEN)) {
        throw new Error(`WebSocket连接未建立或已断开: ${epId}`);
      }
      return new Promise((resolve, reject) => {
        const echo = `api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const timeoutId = setTimeout(() => {
          if (ci.apiCallbacks.has(echo)) {
            ci.apiCallbacks.delete(echo);
            reject(new Error(`API调用超时 (${action})`));
          }
        }, 1e4);
        ci.apiCallbacks.set(echo, {
          resolve: (data) => {
            clearTimeout(timeoutId);
            resolve(data);
          },
          reject: (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
        try {
          const requestData = {
            action,
            params,
            echo
          };
          logger.info(`[${epId}] WebSocket发送API请求: ${JSON.stringify(requestData)}`);
          ci.ws.send(JSON.stringify(requestData));
        } catch (error) {
          clearTimeout(timeoutId);
          ci.apiCallbacks.delete(echo);
          reject(new Error(`发送API请求失败: ${error.message}`));
        }
      });
    }
    /**
     * 关闭WebSocket连接
     * @param {string} epId 骰子的QQ号，如果不提供则关闭所有连接
     */
    static closeWs(epId) {
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
        Object.keys(this.wsConnections).forEach((id) => {
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
    static getWsStatus() {
      const status = {};
      Object.keys(this.wsConnections).forEach((epId) => {
        const ci = this.wsConnections[epId];
        status[epId] = {
          connected: ci.connected,
          url: ci.url,
          readyState: ci.ws.readyState
        };
      });
      return status;
    }
  };
  _WSManager.urlMap = {};
  _WSManager.initDone = false;
  _WSManager.wsConnections = {};
  _WSManager.wsMap = {};
  var WSManager = _WSManager;

  // src/net.ts
  var NetworkClient = class {
    static async init() {
      HTTPManager.init();
      WSManager.init();
    }
    static async getWs(ext) {
      return await WSManager.getWs(ext);
    }
    /** 兼容旧版本HTTP依赖 */
    static async getData(epId, val, data = null) {
      return await this.callApi(epId, val, data);
    }
    /**
     * 调用网络API（统一接口）
     * @param {string} epId 骰子的QQ号，格式如 QQ:12345
     * @param {string} method 调用的方法名，如 get_login_info
     * @param {any} data 调用的方法的参数，默认为null
     * @returns {Promise<any>} 返回API调用结果
     */
    static async callApi(epId, method, data = null) {
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
        logger.info(`当前可用的端点: ${Object.keys(HTTPManager.urlMap).concat(Object.keys(WSManager.urlMap)).join(", ")}`);
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
          return await WSManager.callApiByWs(epId, method, data || {});
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
      return await this.callApi(epId, "send_group_msg", {
        group_id: groupId,
        message
      });
    }
    /**
     * 发送私聊消息的便捷方法
     */
    static async sendPrivateMsg(epId, userId, message) {
      return await this.callApi(epId, "send_private_msg", {
        user_id: userId,
        message
      });
    }
    /**
     * 禁言群成员的便捷方法
     */
    static async setGroupBan(epId, groupId, userId, duration) {
      return await this.callApi(epId, "set_group_ban", {
        group_id: groupId,
        user_id: userId,
        duration
      });
    }
    /**
     * 踢出群成员的便捷方法
     */
    static async setGroupKick(epId, groupId, userId, rejectAddRequest = false) {
      return await this.callApi(epId, "set_group_kick", {
        group_id: groupId,
        user_id: userId,
        reject_add_request: rejectAddRequest
      });
    }
    /**
     * 获取群成员信息的便捷方法
     */
    static async getGroupMemberInfo(epId, groupId, userId, noCache = false) {
      return await this.callApi(epId, "get_group_member_info", {
        group_id: groupId,
        user_id: userId,
        no_cache: noCache
      });
    }
    /**
     * 获取群信息的便捷方法
     */
    static async getGroupInfo(epId, groupId, noCache = false) {
      return await this.callApi(epId, "get_group_info", {
        group_id: groupId,
        no_cache: noCache
      });
    }
  };

  // src/index.ts
  function main() {
    ConfigManager.registerConfig();
    const ext = ConfigManager.ext;
    const cmd = seal.ext.newCmdItemInfo();
    cmd.name = "net";
    cmd.help = `ob11网络连接依赖帮助:
.net init 初始化ob11网络连接依赖
.net close [epId] 关闭WebSocket连接，不指定epId则关闭所有
.net status 查看WebSocket连接状态
.net <方法>
--<参数名>=<参数>

示例:
.net get_login_info
.net send_group_msg --group_id=123456 --message=测试消息
.net close QQ:12345
.net close
.net status`;
    cmd.solve = (ctx, msg, cmdArgs) => {
      if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
        return seal.ext.newCmdExecuteResult(true);
      }
      const epId = ctx.endPoint.userId;
      const ret = seal.ext.newCmdExecuteResult(true);
      const method = cmdArgs.getArgN(1);
      switch (method) {
        case "init": {
          NetworkClient.init().then(() => {
            seal.replyToSender(ctx, msg, "ob11网络连接依赖初始化完成");
          }).catch((error) => {
            seal.replyToSender(ctx, msg, `初始化失败: ${error.message}`);
          });
          return ret;
        }
        case "close": {
          const targetEpId = cmdArgs.getArgN(2);
          const count = WSManager.closeWs(targetEpId);
          if (targetEpId) {
            seal.replyToSender(ctx, msg, count > 0 ? `已关闭 ${targetEpId} 的连接` : `${targetEpId} 没有连接`);
          } else {
            seal.replyToSender(ctx, msg, `已关闭 ${count} 个WebSocket连接`);
          }
          return ret;
        }
        case "status": {
          const status = WSManager.getWsStatus();
          const statusText = Object.keys(status).length > 0 ? JSON.stringify(status, null, 2) : "没有WebSocket连接";
          seal.replyToSender(ctx, msg, `WebSocket连接状态:
${statusText}`);
          return ret;
        }
        case "":
        case "help": {
          ret.showHelp = true;
          return ret;
        }
        default: {
          const data = cmdArgs.kwargs.reduce((acc, kwarg) => {
            const { name, value } = kwarg;
            try {
              acc[name] = JSON.parse(`[${value}]`)[0];
            } catch (e) {
              acc[name] = value;
            }
            return acc;
          }, {});
          NetworkClient.callApi(epId, method, data).then((result) => {
            seal.replyToSender(ctx, msg, JSON.stringify(result, null, 2));
          }).catch((error) => {
            seal.replyToSender(ctx, msg, `调用失败: ${error.message}`);
          });
          return ret;
        }
      }
    };
    ext.cmdMap["net"] = cmd;
    globalThis.net = NetworkClient;
    const extHTTP = seal.ext.find("HTTP依赖");
    if (!extHTTP) {
      globalThis.http = NetworkClient;
    }
  }
  main();
})();
