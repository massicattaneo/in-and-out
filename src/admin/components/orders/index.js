import { HtmlView } from 'gml-html';
import template from './template.html';
import list from './orders-list.html';
import bonusTpl from './bonus-edit.html';
import * as style from './style.scss';
import * as listStyle from './list.scss';
import { createModal } from '../../utils';
import createBillTpl from './create-bill.html';

function filterClients(find) {
    return function (i) {
        if (find === '') return true;
        const d = new Date(i.created).formatDay('dd-mm-yyyy', []);
        return i.email.toLowerCase().indexOf(find) !== -1 || d.indexOf(find) !== -1 || i._id.indexOf(find) !== -1;
    };
}

function getBuytypeIndex(id) {
    return ['TRT', 'TAR', 'PRD'].indexOf(id.substr(0, 3));
}

function mapReceiver(order) {
    const isGift = ['NO', 'TODA LA COMPRA', 'SOLO PRODUCTOS'];
    const keys = {
        name: 'NOMBRE',
        address: 'DIRECCION',
        city: 'POBLACION',
        cap: 'CODIGO POSTAL',
        tel: 'TELEFONO',
        isGift: 'ES UN REGALO'
    };
    return k => {
        return `${keys[k]}: ${k === 'isGift' ? isGift[order.sendTo[k]] : order.sendTo[k]}`;
    };
}

export default async function ({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);
    const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));

    view.style();

    window.rx.connect({ width: () => system.deviceInfo().width }, function ({ width }) {
        view.style('', { footer: { left: width > 1024 ? 240 : 0 } });
    });

    window.rx.connect({
        search: () => system.store.search,
        orders: () => system.store.orders
    }, function ({ search, orders }) {
        const v = view.clear('orders').appendTo('orders', list, listStyle, {
            orders: orders
                .filter(filterClients(search))
                .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                .map(i => {
                    const date = new Date(i.created).formatDay('dddd, dd-mm-yyyy', dayNames);
                    const hour = new Date(i.created).formatTime('hh:mm');
                    return {
                        date: `${date} - ${hour}`,
                        payed: i.payed ? 'SI' : 'NO',
                        email: i.email,
                        amount: system.toCurrency(i.amount / 100),
                        id: i._id,
                        buttons: i.cart.map(({ id, used }, index) => {
                            const typeIndex = getBuytypeIndex(id);
                            const buyTypes = ['treatments', 'bonusCards', 'products'];
                            const type = buyTypes[typeIndex];
                            const item = Object.assign({}, system.publicDb[type].find(i => i.identificador === id || i.id === id));
                            item.title = `<strong>${locale.get(`sellTypes.${type}`)}:</strong> ${item.title || item.titulo}`;
                            item.price = system.toCurrency(item.precio || item.price);
                            return `<button type="button" style="width: 100%"
                                        onclick="this.form.use('${i._id}', ${index})"
                                        ${(i.payed && !used) ? '' : 'disabled'}
                                        class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent"
                                        data-upgraded=",MaterialButton,MaterialRipple">
                                    ${item.title} ${item.price}
                                    <i class="material-icons"></i>
                                    <span class="mdl-button__ripple-container">
                                <span class="mdl-ripple"></span>
                                </span>
                                </button>`;
                        }).join('<hr style="margin-bottom: 4px; clear: both; display: block"/>')
                    };
                })
        });
        v.style();
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        view.get('month').innerText = `ESTE MESE: ${system.toCurrency(orders.filter(o => new Date(o.created).getTime() >= date.getTime()).reduce((tot, o) => tot + o.amount, 0) / 100)}`;
        view.get('count').innerText = `NUMERO: ${orders.length}`;
        view.get('total').innerText = `TOTAL: ${system.toCurrency(orders.reduce((tot, o) => tot + o.amount, 0) / 100)}`;
    });

    view.get('wrapper').createBill = async function (orderId) {
        const { modalView, modal } = createModal(createBillTpl, {}, async function (close) {
            const name = modalView.get('name').value;
            const nif = modalView.get('nif').value;
            const address = modalView.get('address').value;
            const cap = modalView.get('cap').value;
            const city = modalView.get('city').value;
            window.open(`/api/bills/orders/${orderId}?name=${name}&nif=${nif}&address=${address}&cap=${cap}&city=${city}`);
            close();
        });
        const order = system.store.orders.find(o => o._id === orderId);
        const client = system.store.clients.find(i => i.email === order.email);
        if (client)
            modalView.get('name').value = `${client.name} ${client.surname}`;
    };

    view.get('wrapper').use = async function (orderId, index) {
        const order = system.store.orders.find(o => o._id === orderId);
        const typeIndex = getBuytypeIndex(order.cart[index].id);
        if (typeIndex === 2) {
            const send = Object.keys(order.sendTo).map(mapReceiver(order)).join('\n');
            if (confirm(`DATOS DE ENVIO:\n\n${send}\n\n HAS ENVIADO EL PRODUCTO?`)) {
                order.cart[index].used = true;
                await thread.execute('rest-api', {
                    api: `orders/${orderId}`,
                    method: 'put',
                    cart: order.cart
                });
                system.store.search = '';
            }
        } else if (typeIndex === 0) {
            if (confirm('ESTAS SEGURO DE UTILIZAR ESTE TRATAMIENTO?')) {
                order.cart[index].used = true;
                await thread.execute('rest-api', {
                    api: `orders/${orderId}`,
                    method: 'put',
                    cart: order.cart
                });
                system.store.search = '';
            }
        } else if (typeIndex === 1) {
            const { id } = order.cart[index];
            const bonus = system.publicDb.bonusCards.find(d => d.id === id);
            const amount = Number(bonus.price);
            const { modalView } = createModal(bonusTpl, {
                bonus, amount: system.toCurrency(amount),
                clients: system.store.clients.sort((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name))
            }, async function (close) {
                if (!this.clientId.value) {
                    const res = confirm(`SI NO SELECIONAS UN CLIENTE EL BONO "${bonus.title}" SE MARCARA' COMO USADO SIN CONVERTIRLO. ESTAS SEGURO?`);
                    if (res) {
                        order.cart[index].used = true;
                        await thread.execute('rest-api', {
                            api: `orders/${orderId}`,
                            method: 'put',
                            cart: order.cart
                        });
                        system.store.search = '';
                        close();
                    }
                    return;
                }
                if (order.cart[index].used === true) {
                    system.throw('generic');
                }
                await thread.execute('rest-api', {
                    api: 'bonus',
                    method: 'post',
                    clientId: this.clientId.value,
                    created: new Date(order.created).getTime(),
                    price: bonus.price,
                    credit: bonus.credit,
                    payed: amount,
                    finished: false,
                    title: bonus.title,
                    transactionId: '',
                    orderId: order._id,
                    transactions: [],
                    treatments: (bonus.credit > 0) ? [] : bonus.treatments
                });
                order.cart[index].used = true;
                await thread.execute('rest-api', {
                    api: `orders/${orderId}`,
                    method: 'put',
                    cart: order.cart
                });
                system.store.search = '';
                close();
            });
            const client = system.store.clients.find(i => i.email === order.email);
            if (client)
                modalView.get('client').value = client._id;
        }
    };

    view.get('wrapper').scanqr = function () {
        const scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
        scanner.addListener('scan', function (content) {
            scanner.stop();
            const order = system.store.orders.find(i => i._id === content);
            system.store.search = order._id;
        });
        Instascan.Camera.getCameras().then(function (cameras) {
            if (cameras.length > 0) {
                scanner.start(cameras[0]);
            } else {
                console.error('No cameras found.');
            }
        }).catch(function (e) {
            console.error(e);
        });
    };

    view.destroy = function () {

    };

    return view;
}
