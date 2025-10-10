import { ConfigManager } from "./config";
import { NetworkClient } from "./net";
import { WSManager } from "./ws";

function main() {
  ConfigManager.registerConfig();
  const ext = ConfigManager.ext;

  const cmd = seal.ext.newCmdItemInfo();
  cmd.name = 'net';
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
      case 'init': {
        NetworkClient.init().then(() => {
          seal.replyToSender(ctx, msg, 'ob11网络连接依赖初始化完成');
        }).catch(error => {
          seal.replyToSender(ctx, msg, `初始化失败: ${error.message}`);
        });
        return ret;
      }
      case 'close': {
        const targetEpId = cmdArgs.getArgN(2);
        const count = globalThis.net.closeWebSocket(targetEpId);
        if (targetEpId) {
          seal.replyToSender(ctx, msg, count > 0 ? `已关闭 ${targetEpId} 的连接` : `${targetEpId} 没有连接`);
        } else {
          seal.replyToSender(ctx, msg, `已关闭 ${count} 个WebSocket连接`);
        }
        return ret;
      }
      case 'status': {
        const status = globalThis.net.getWebSocketStatus();
        const statusText = Object.keys(status).length > 0 ?
          JSON.stringify(status, null, 2) : '没有WebSocket连接';
        seal.replyToSender(ctx, msg, `WebSocket连接状态:\n${statusText}`);
        return ret;
      }
      case '':
      case 'help': {
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

        globalThis.net.callApi(epId, method, data).then(result => {
          seal.replyToSender(ctx, msg, JSON.stringify(result, null, 2));
        }).catch(error => {
          seal.replyToSender(ctx, msg, `调用失败: ${error.message}`);
        });

        return ret;
      }
    }
  };

  ext.cmdMap['net'] = cmd;


  globalThis.net = NetworkClient;
  globalThis.ws = WSManager;
}

main();
