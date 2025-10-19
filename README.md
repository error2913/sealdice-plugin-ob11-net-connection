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

net.getEventDispatcher(ext)
    .then((ed) => {
        ed.onEvent = (epId, event) => {
            console.log('onEvent', epId, JSON.stringify(event));
        }
        ed.onMessageEvent = (epId, event) => { };
        ed.onNoticeEvent = (epId, event) => { };
        ed.onRequestEvent = (epId, event) => { };
        ed.onMetaEvent = (epId, event) => { };
    })
    .catch((err) => {
        console.error('getEventDispatcher error:', err);
    });
```