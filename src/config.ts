export const VERSION = "2.0.0";
export const AUTHOR = "错误&白鱼";
export const NAME = "ob11网络连接依赖";

export class ConfigManager {
    static ext: seal.ExtInfo;
    static cache: {
        [key: string]: {
            timestamp: number,
            data: any
        }
    } = {}

    static registerConfig() {
        this.ext = ConfigManager.getExt(NAME);
        seal.ext.registerTemplateConfig(this.ext, 'HTTP地址', ['http://127.0.0.1:8091'], '修改后保存并重新初始化');
        seal.ext.registerTemplateConfig(this.ext, 'HTTP Access Token', ['', ''], '在这里填入你的Access Token，与上面的地址一一对应，如果没有则留空');
        seal.ext.registerTemplateConfig(this.ext, 'WS地址', ['ws://127.0.0.1:8081'], '修改后保存并重新初始化');
        seal.ext.registerTemplateConfig(this.ext, 'WS Access Token', ['', ''], '在这里填入你的Access Token，与上面的地址一一对应，如果没有则留空');
        seal.ext.registerOptionConfig(this.ext, "日志打印方式", "简短", ["永不", "简短", "详细"], '');
        seal.ext.registerOptionConfig(this.ext, "事件处理", "记录", ["忽略", "记录"], '设置对WebSocket事件的处理方式');
    }

    static getCache<T>(key: string, getFunc: () => T): T {
        const timestamp = Date.now()
        if (this.cache?.[key] && timestamp - this.cache[key].timestamp < 3000) {
            return this.cache[key].data;
        }

        const data = getFunc();
        this.cache[key] = {
            timestamp: timestamp,
            data: data
        }

        return data;
    }

    static get httpUrl() { return this.getCache('httpUrl', () => seal.ext.getTemplateConfig(this.ext, 'HTTP地址')) }
    static get httpToken() { return this.getCache('httpToken', () => seal.ext.getTemplateConfig(this.ext, 'HTTP Access Token')) }
    static get wsUrl() { return this.getCache('wsUrl', () => seal.ext.getTemplateConfig(this.ext, 'WS地址')) }
    static get wsToken() { return this.getCache('wsToken', () => seal.ext.getTemplateConfig(this.ext, 'WS Access Token')) }
    static get logLevel() { return this.getCache('logLevel', () => seal.ext.getOptionConfig(this.ext, "日志打印方式")) }
    static get eventLevel() { return this.getCache('eventLevel', () => seal.ext.getOptionConfig(this.ext, "事件处理")) }

    static getExt(name: string): seal.ExtInfo {
        if (name == NAME && ConfigManager.ext) {
            return ConfigManager.ext;
        }

        let ext = seal.ext.find(name);
        if (!ext) {
            ext = seal.ext.new(name, AUTHOR, VERSION);
            seal.ext.register(ext);
        }

        return ext;
    }
}