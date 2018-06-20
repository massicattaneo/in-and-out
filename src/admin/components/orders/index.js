import { HtmlView } from "gml-html";
import template from './template.html';
import list from './orders-list.html';
import bonusTpl from './bonus-edit.html'
import * as style from './style.scss';
import * as listStyle from './list.scss';
import { createModal } from "../../utils";

function filterClients(find) {
    return function(i) {
        if (find === '') return true;
        const d = new Date(i.created).formatDay('dd-mm-yyyy', []);
        return i.email.toLowerCase().indexOf(find) !== -1 || d.indexOf(find) !== -1 || i._id.indexOf(find) !== -1;
    }
}

export default async function({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);
    const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));

    view.style();

    ({ search: () => system.store.search, orders: () => system.store.orders })
        .reactive()
        .connect(function({ search, orders }) {
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
                                const item = Object.create((id.startsWith('TRT'))
                                    ? system.publicDb.treatments.find(i => i.identificador === id)
                                    : system.publicDb.bonusCards.find(i => i.id === id));
                                item.title = item.titulo
                                    ? `<strong>TRATAMIENTO:</strong> ${item.titulo}` :
                                    `<strong>B/TR</strong>: ${item.title}`;
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
                                </button>`
                            }).join('<hr style="margin-bottom: 4px; clear: both; display: block"/>')
                        }
                    })
            });
            v.style();
        });

    view.get('wrapper').use = async function(orderId, index) {
        const order = system.store.orders.find(o => o._id === orderId);
        if (system.publicDb.treatments.find(i => i.identificador === order.cart[index].id)) {
            if (confirm('ESTAS SEGURO DE UTILIZAR ESTE TRATAMIENTO?')) {
                order.cart[index].used = true;
                await thread.execute('rest-api', {
                    api: `orders/${orderId}`,
                    method: 'put',
                    cart: order.cart
                });
            }
        } else {
            const { modalView } = createModal(bonusTpl, { clients: system.store.clients }, async function(close) {
                if (!this.clientId.value) system.throw('custom', {message: 'SELCIONA UN CLIENTE'});
                const { id } = order.cart[index];
                const bonus = system.publicDb.bonusCards.find(d => d.id === id);
                const amount = Number(bonus.price);
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
                close();
            });
            const client = system.store.clients.find(i => i.email === order.email);
            if (client)
                modalView.get('client').value = client._id;
        }
    };

    view.destroy = function() {

    };

    return view;
}