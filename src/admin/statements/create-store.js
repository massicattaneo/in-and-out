export default async function ({ system, thread }) {
    let status = await getStatus();
    const req = RetryRequest('/api/public-db', { headers: { 'Content-Type': 'application/json' } });
    const publicDb = JSON.parse((await req.get()).responseText);
    publicDb.bonusCards = publicDb.bonusCards.map(function (b) {
        const from = new Date(b.desde.split('/')[2], b.desde.split('/')[1], b.desde.split('/')[0]);
        from.setHours(0, 0, 0);
        from.setMonth(from.getMonth() - 1);
        const to = new Date(b.hasta.split('/')[2], b.hasta.split('/')[1], b.hasta.split('/')[0]);
        to.setHours(23, 59, 59);
        to.setMonth(to.getMonth() - 1);
        return Object.assign(b, {
            id: b.identificador,
            credit: Number(b.credito),
            description: b.descripcion.trim(),
            price: Number(b.precio),
            title: b.titulo,
            from: from.getTime(),
            to: to.getTime(),
            treatmentsString: typeof b.tratamientos === 'string'
                ? b.tratamientos.split('|')
                    .map(i => i.trim())
                    .map(t => {
                        const arr = t.split('x');
                        return `${arr[0]} ${publicDb.treatments.find(t => t.identificador === arr[1]).titulo}`;
                    })
                : [],
            treatments: typeof b.tratamientos === 'string'
                ? b.tratamientos.split('|')
                    .map(i => i.trim())
                    .map(t => {
                        const arr = t.split('x');
                        return (new Array(Number(arr[0]))).fill(0).map(i => arr[1]);
                    }).reduce((arr, t) => arr.concat(t), [])
                : []
        });
    });
    system.publicDb = publicDb;

    system.store = window.rx.create({
        logged: status.logged,
        adminLevel: status.adminLevel,
        loading: false,
        search: '',
        clients: [],
        orders: [],
        cash: [],
        bills: [],
        cart: system.getStorage('cart') || [],
        users: [...((decodeURI(system.cookies.getItem('users')) || '')).split('|')],
        date: Date.now(),
        keysPressed: []
    });

    system.initStorage({});

    window.rx.connect({ cart: () => system.store.cart }, function ({ cart }) {
        system.setStorage({ cart: cart });
    });

    async function getStatus() {
        const reqStatus = RetryRequest('/api/login/adminStatus');
        try {
            const status = JSON.parse((await reqStatus.get()).responseText);
            return status;
        } catch (e) {
            return status = {
                logged: false,
                idAdmin: false,
                email: ''
            };
        }
    }

    async function whenLogged({ logged }) {
        const s = await getStatus();
        const data = await thread.execute('get-admin-db');
        system.store.adminLevel = s.adminLevel;
        system.store.clients.splice(0, system.store.clients.length);
        system.store.clients.push(...data.clients);
        system.store.orders.splice(0, system.store.orders.length);
        system.store.orders.push(...data.orders);
        system.store.bills.splice(0, system.store.bills.length);
        system.store.bills.push(...data.bills);
        system.store.users.splice(0, system.store.users.length);
        if (logged) {
            system.store.users.push(...((decodeURI(system.cookies.getItem('users')) || '')).split('|'));
        }
    }

    window.rx.connect({ logged: () => system.store.logged }, whenLogged);

    await whenLogged(system.store).catch(e => e);

}
