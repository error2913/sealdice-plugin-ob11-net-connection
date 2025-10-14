# sealdice-plugin-ob11-net-connection

注意依赖关系

``` javascript
const net = globalThis.net;

net.callApi(epId, method, data)
    .then((res) => {
        console.log('callApi', epId, method, JSON.stringify(data), JSON.stringify(res));
    })
    .catch((err) => {
        console.error('callApi error:', err);
    });

net.getWs(ext)
    .then((ws) => {
        ws.onEvent = (epId, event) => {
            console.log('onEvent', epId, JSON.stringify(event));
        }
        ws.onMessageEvent = (epId, event) => { };
        ws.onNoticeEvent = (epId, event) => { };
        ws.onRequestEvent = (epId, event) => { };
        ws.onMetaEvent = (epId, event) => { };
    })
    .catch((err) => {
        console.error('getWs error:', err);
    });
```