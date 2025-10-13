# sealdice-plugin-ob11-net-connection

注意依赖关系

``` javascript
globalThis.ws.getWs(ext)
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
        console.log('getWs error:', err);
    });
```

``` javascript
globalThis.net.callApi(epId, method, data);
```