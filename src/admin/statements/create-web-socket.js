const protocol = () => location.hostname === 'localhost' ? 'ws' : 'wss';

function createWebSocket() {
    return new Promise(function (resolve, reject) {
        const ws = new WebSocket(`${protocol()}://${location.hostname}:${location.port}`);
        ws.onopen = () => resolve(ws);
        ws.onerror = reject;
    });
}

function createReaderWebSocket() {
    return new Promise(function (resolve, reject) {
        const ws = new WebSocket('wss://localhost:8999');
        ws.onopen = () => resolve(ws);
        ws.onerror = reject;
    });
}

export default function ({ system, gos }) {
    const ctx = this;
    return new Promise(function (resolve) {
            if (!system.store.logged) return resolve();
            let serverWs = new WebSocket(`${protocol()}://${location.hostname}:${location.port}`);
            let nfcWs = new WebSocket('wss://localhost:8999');
            const restMapping = { users: 'clients', cash: 'cash', orders: 'orders' };
            Promise.all([
                new Promise(r => {
                    serverWs.onopen = function () {
                        setInterval(async function () {
                            if (serverWs.readyState !== serverWs.OPEN) {
                                serverWs.close();
                                console.log('reopening serverWs websocket');
                                serverWs = await createWebSocket();
                                serverWs.onmessage = onMessage;
                            }
                        }, 5000);
                        r();
                    };
                    serverWs.onerror = function () {
                        r();
                        system.throw('custom', { message: 'POR FAVOR RECARGA LA PAGINA' });
                    };
                }),
                new Promise(r => {
                    nfcWs.onopen = function () {
                        setInterval(async function () {
                            if (nfcWs.readyState !== nfcWs.OPEN) {
                                nfcWs.close();
                                console.log('reopening nfcWs websocket');
                                nfcWs = await createReaderWebSocket();
                                system.nfc = nfcWs;
                                nfcWs.onmessage = onReaderMessage;
                            }
                        }, 5000);
                        r();
                    };
                    nfcWs.onerror = function () {
                        r();
                        system.throw('custom', { message: 'LECTOR DE TARJETAS NO ESTA LISTO' });
                    };
                })
            ]).then(resolve).catch(resolve);

            function onMessage(ev) {
                const { type, data } = JSON.parse(ev.data);
                const { clients } = system.store;
                gos.homePage.refresh();
                if (type === 'insert-rest-uploads') return;
                if (type.indexOf('-rest-') !== -1) {
                    const a = type.split('-');
                    const storeElement = system.store[restMapping[a[2]] || a[2]];
                    if (a[2] === 'cash' && location.pathname.endsWith('historial')) {
                        gos.history.update({ id: data.clientId });
                    }
                    if (a[2] === 'bonus') {
                        gos.history.update({ id: data.clientId });
                    } else if (storeElement) {
                        switch (a[0]) {
                        case 'insert':
                            storeElement.push(data);
                            break;
                        case 'update':
                            storeElement.splice(storeElement.indexOf(storeElement.find(i => i._id === data._id)), 1);
                            setTimeout(() => storeElement.push(data), 100);
                            break;
                        case 'delete':
                            storeElement.splice(storeElement.indexOf(storeElement.find(i => i._id === data._id)), 1);
                            break;
                        }
                    }
                } else {
                    switch (type) {
                    case 'insertUser':
                        clients.push(data);
                        break;
                    case 'deleteUser':
                        const index = clients.indexOf(clients.find(i => i._id === data.userId));
                        clients.splice(index, 1);
                        clients.push(data);
                        break;
                    case 'insertEvent':
                        gos.events.add(data);
                        break;
                    case 'deleteEvent':
                        gos.events.remove(data.calendarId, data.eventId);
                        break;
                    }
                }
                setTimeout(componentHandler.upgradeDom, 100);
            }

        function onReaderMessage(ev) {
            const errors = {
                write: 'ERROR NEL GRABAR LA TARJETA',
                read: 'ERROR NEL LEER LA TARJETA'
            };
            if (ev.data === 'write-done') {
                system.throw('custom', { message: 'TARJETA GRABADA' });
            }
            const { id, error } = JSON.parse(ev.data);
            if (error) {
                system.throw('custom', { message: errors[error] });
            } else if (id) {
                const old = system.store.clients.find(c => c.fb_cardId === id.substr(0, 20));
                if (old) {
                    system.navigateTo(ctx.locale.get('urls.history.href') + `?id=${old._id}`);
                } else {
                    const newC = system.store.clients.find(c => c._id === id.substr(0, 24));
                    if (newC) {
                        system.navigateTo(ctx.locale.get('urls.history.href') + `?id=${newC._id}`);
                    } else {
                        system.throw('custom', { message: 'LA TARJETA NO APARTIENE A NINGUN CLIENTE' });
                    }
                }
            }
        }

            serverWs.onmessage = onMessage;
            nfcWs.onmessage = onReaderMessage;
            system.nfc = nfcWs;
        }
    );
}
