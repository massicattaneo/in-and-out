export default function({ system, gos }) {
    const ctx = this;
    return new Promise(function(resolve) {
            if (!system.store.logged) return resolve();
            const serverWs = new WebSocket(`wss://${location.hostname}:${location.port}`);
            const nfcWs = new WebSocket('wss://localhost:8999');
            const restMapping = { users: 'clients', cash: 'cash', orders: 'orders' };
            Promise.all([
                new Promise(r => {
                    serverWs.onopen = r;
                    serverWs.onerror = function() {
                        r();
                        system.throw('custom', { message: 'POR FAVOR RECARGA LA PAGINA' });
                    };
                }),
                new Promise(r => {
                    nfcWs.onopen = r;
                    nfcWs.onerror = function() {
                        r();
                        system.throw('custom', { message: 'LECTOR DE TARJETAS NO ESTA LISTO' });
                    };
                })
            ]).then(resolve).catch(resolve);

            serverWs.onmessage = function(ev) {
                const { type, data } = JSON.parse(ev.data);
                const { clients } = system.store;
                gos.homePage.refresh();
                if (type.indexOf('-rest-') !== -1) {
                    const a = type.split('-');
                    const storeElement = system.store[restMapping[a[2]]];
                    if (a[2] === 'bonus') {
                        gos.history.update({ id: data.clientId });
                    } else {
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
            };

            nfcWs.onmessage = function(ev) {
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
            };

            system.nfc = nfcWs;
        }
    );
}