import { HtmlView, HandlebarParse } from 'gml-html';
import template from './template.html';
import bonusTpl from './bonus.html';
import giftNewTpl from './gift-new.html';
import bonusNewTpl from './bonus-new.html';
import createBillTpl from './create-bill.html';
import * as style from './style.scss';
import { createModal } from '../../utils';
import {
    activePromotions,
    getDiscountsItems,
    getDiscountsPrice,
    getPromotionDiscounts,
    getCartTotal
} from '../../../../web-app-deploy/shared';
import editCash from '../cash/edit-cash.html';

export default async function ({ locale, system, thread, wait }) {
    const view = HtmlView('<div>{{templates.loading}}</div>', [], locale.get());
    const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));
    let selectedTab = 0;
    view.style();

    view.update = async function ({ id }) {
        system.store.loading = true;
        view.clear();
        const client = system.store.clients.find(c => c._id === id);
        const bonuses = await thread.execute('rest-api', {
            method: 'get',
            api: `bonus?clientId=${id}`
        });
        const transactions = await thread.execute('rest-api', {
            method: 'get',
            api: `cash?clientId=${id}`
        });
        const orders = await thread.execute('rest-api', {
            method: 'get',
            api: `orders?email=${system.store.clients.find(c => c._id === id).email}`
        });
        console.log(client.googleReview);
        const v = view.clear()
            .appendTo('', template, style, Object.assign({
                client,
                bonuses: bonuses.filter(b => !b.finished)
                    .map(b => Object.assign({ tab: createTab(b) }, b)),
                transactions: transactions.map(t => {
                    return {
                        description: t.description,
                        date: (new Date(t.date)).formatDay('dd-mm-yy'),
                        amount: system.toCurrency(t.amount)
                    };
                }),
                finished: bonuses
                    .sort((a, b) => b.created - a.created)
                    .filter(b => b.finished).map(b => {
                        return {
                            title: `${b.title} ${system.toCurrency(b.payed || b.credit || 0)}`,
                            list: b.transactions
                                .map(i => `<li>(${new Date(i.created).formatDay('dd-mm-yy')}) ${i.note || ''} <strong>${system.toCurrency(i.amount || 0)}</strong></li>`)
                                .join('')
                        };
                    }),
                orders: orders
                    .map(o => {
                        const used = o.cart.filter(i => i.used);
                        return {
                            date: new Date(o.created).formatDay('dd/mm/yyyy'),
                            payed: o.payed ? 'SI' : 'NO',
                            used: used.length === 0 ? 'NO' : (o.cart.length === used.length ? 'SI' : 'EN PARTE'),
                            amount: system.toCurrency(o.amount / 100)
                        };
                    })
            }, locale.get()));

        bonuses.filter(b => !b.finished).forEach(function (b, i) {
            v.get(`bonus_${b._id}`).setIndex = () => selectedTab = i;
        });

        system.store.loading = false;
        componentHandler.upgradeDom();
        if (document.getElementById('history_bonus_tabs') && document.getElementById('history_bonus_tabs').children[selectedTab])
            document.getElementById('history_bonus_tabs').children[selectedTab].click();

        v.get('wrapper').writeCard = function () {
            system.nfc.send(id);
        };

        v.get('wrapper').sendGoogleReviewEmail = async function (centerIndex) {
            if (client.emails && client.emails.filter(e => e.centerIndex === centerIndex).length) {
                const items = client.emails
                    .filter(e => e.centerIndex === centerIndex)
                    .map(e => (new Date(e.sent).formatDay('dd-mm-yy')));
                return alert(`Ya enviaste el correo por ${system.publicDb.centers[centerIndex].label} en estas fechas: ${items.join(',')}`);
            }
            if (confirm(`Quieres enviar un correo a este usuario para pedirle que deje su valoracion sobre el centro de ${system.publicDb.centers[centerIndex].label}?`)) {
                const req = RetryRequest('/api/email/googleReview', { headers: { 'Content-Type': 'application/json' } });
                const res = await req.post(JSON.stringify({ name: client.name, email: client.email, centerIndex }));
                if (res.responseText !== 'ok') system.throw('send-email-error');
                const emails = client.emails || [];
                emails.push({ centerIndex, sent: new Date().toISOString(), type: 'googleReview' });
                await thread.execute('rest-api', { api: `users/${id}`, method: 'put', emails });
            }
        };

        v.get('wrapper').addCash = async function () {
            const { modalView, modal } = createModal(editCash, { users: system.store.users }, async function (close) {
                if (!this.description.value) system.throw('custom', { message: 'FALTA LA DESCRIPCION' });
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA O EFECTIVO?' });
                await thread.execute('rest-api', {
                    api: 'cash',
                    method: 'post',
                    date: this.date.valueAsNumber,
                    clientId: id,
                    description: this.description.value,
                    amount: Number(this.amount.value),
                    type: this.type.value,
                    user: this.user.value
                });
                close();
            });

            modalView.get('date').valueAsNumber = (new Date()).getTime();
            modalView.get('description').focus();
            modalView.get('clientwrapper').style.display = 'none';
            modalView.get('description').setSelectionRange(0, modalView.get('description').value.length);
            // fillClients(modalView, '');
        };

        v.get('wrapper').createBill = async function () {
            const { modalView, modal } = createModal(createBillTpl, {}, async function (close) {
                const name = modalView.get('name').value;
                const nif = modalView.get('nif').value;
                const address = modalView.get('address').value;
                const cap = modalView.get('cap').value;
                const city = modalView.get('city').value;
                const date = new Date(modalView.get('date').valueAsNumber).formatDay('yyyy-mm-dd');
                window.open(`/api/bills/cash/${id}/${date}?name=${name}&nif=${nif}&address=${address}&cap=${cap}&city=${city}`);
                close();
            });
            modalView.get('date').valueAsNumber = (new Date()).getTime();
            modalView.get('name').value = `${client.name} ${client.surname}`;
        };

        v.get('wrapper').addPromotion = async function () {
            const item = activePromotions(system.publicDb.promotions, 1)[0];
            const discounts = getPromotionDiscounts(item);
            const amount = getDiscountsPrice(system.publicDb, discounts);
            const cartIds = getDiscountsItems(discounts);

            const { modalView } = createModal(giftNewTpl, { title: item.titulo, amount }, async function (close) {
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA o EFECTIVO?' });
                const date = Date.now();
                const payed = Number(this.amount.value);
                const t = await thread.execute('rest-api', {
                    api: 'cash',
                    method: 'post',
                    amount: payed,
                    clientId: id,
                    date: date,
                    type: this.type.value,
                    user: system.store.users[0],
                    description: `COMPRA ${item.titulo} (${system.toCurrency(payed)})`
                });
                await thread.execute('rest-api', {
                    api: 'bonus',
                    method: 'post',
                    clientId: id,
                    created: date,
                    credit: 0,
                    payed: payed,
                    price: amount,
                    finished: false,
                    title: item.titulo,
                    transactionId: t._id,
                    transactions: [],
                    treatments: cartIds
                });
                close();
            });
            modalView.get('amount').focus();
        };

        v.get('wrapper').addBonus = function () {
            const { modalView } = createModal(bonusNewTpl, {}, async function (close) {
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR PAGADO' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA o EFECTIVO?' });
                const bonus = system.publicDb.bonusCards.find(i => i.id === this.bonus.value);
                const date = Date.now();
                const amount = Number(this.amount.value);
                const t = await thread.execute('rest-api', {
                    api: 'cash',
                    method: 'post',
                    amount: amount,
                    clientId: id,
                    date: date,
                    type: this.type.value,
                    user: system.store.users[0],
                    description: `COMPRA ${bonus.title} (${system.toCurrency(amount)})`
                });
                await thread.execute('rest-api', {
                    api: 'bonus',
                    method: 'post',
                    clientId: id,
                    created: date,
                    credit: 0,
                    payed: amount,
                    price: getCartTotal(system.publicDb, [this.bonus.value]).total,
                    finished: false,
                    title: bonus.title,
                    transactionId: t._id,
                    transactions: [],
                    treatments: bonus.treatments
                });

                close();
            });
            modalView.get('bonus').innerHTML = system.publicDb.bonusCards
                .filter(b => b.credit === 0)
                .filter(b => Date.now() >= b.from && Date.now() <= b.to)
                .map(b => `<option value="${b.id}">${b.title.trim()} (${system.toCurrency(b.price)})</option>`)
                .join('');

            modalView.get('form').setValue = setValue;

            function setValue() {
                const id = modalView.get('bonus').value;
                if (id) {
                    modalView.get('amount').value = getCartTotal(system.publicDb, [id]).total;
                }
                componentHandler.upgradeDom();
            }

            setValue();
        };

        v.get('wrapper').addGift = function () {
            const { modalView } = createModal(giftNewTpl, { title: 'Tarjeta regalo' }, async function (close) {
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA o EFECTIVO?' });
                const date = Date.now();
                const amount = Number(this.amount.value);
                const t = await thread.execute('rest-api', {
                    api: 'cash',
                    method: 'post',
                    amount: amount,
                    clientId: id,
                    date: date,
                    type: this.type.value,
                    user: system.store.users[0],
                    description: `COMPRA TARJETA REGALO (${system.toCurrency(amount)})`
                });
                await thread.execute('rest-api', {
                    api: 'bonus',
                    method: 'post',
                    clientId: id,
                    created: date,
                    credit: amount,
                    payed: amount,
                    finished: false,
                    title: this.title.value,
                    transactionId: t._id,
                    transactions: [],
                    treatments: []
                });
                close();
            });
            modalView.get('amount').focus();
        };

        v.get('wrapper').useGift = async function (id) {
            const value = document.getElementById(`amount_${id}`).value;
            const note = document.getElementById(`note_${id}`).value || '';
            if (!value) system.throw('custom', { message: 'FALTA EL VALOR' });
            const bonus = bonuses.find(b => b._id === id);
            const trs = bonus.transactions.concat([
                { amount: Number(value), note, created: Date.now() }
            ]);
            await thread.execute('rest-api', {
                api: `bonus/${id}`,
                method: 'put',
                transactions: trs,
                finished: (bonus.credit + trs.reduce((sum, i) => sum + i.amount, 0)) <= 0
            });
        };

        v.get('wrapper').useBonus = async function (id, trId, title, icon) {
            console.log(trId);
            if (icon === 'cancel' && confirm(`Quieres utilizar la sesion de "${title.toUpperCase()}"?`)) {
                const bonus = bonuses.find(b => b._id === id);
                const trs = bonus.transactions.concat([
                    { treatmentId: trId, created: Date.now() }
                ]);
                await thread.execute('rest-api', {
                    api: `bonus/${id}`,
                    method: 'put',
                    transactions: trs,
                    finished: trs.length === bonus.treatments.length
                });
            } else if (icon !== 'cancel' && prompt(`Quieres reactivar la sesion de "${title.toUpperCase()}"?`) === 'carmen') {
                const bonus = bonuses.find(b => b._id === id);
                const array = bonus.transactions.filter(t => t.treatmentId === trId);
                const index = bonus.transactions.findIndex(t => t === array[array.length - 1]);
                const trs = bonus.transactions.slice(0);
                trs.splice(index, 1);
                await thread.execute('rest-api', {
                    api: `bonus/${id}`,
                    method: 'put',
                    transactions: trs,
                    finished: false
                });
            }
        };

        v.get('wrapper').payRemainingBonus = async function (bonusId) {
            const value = document.getElementById(`bonus_pay_amount_${bonusId}`).value;
            const type = this[`type_${bonusId}`].value;
            if (!value) system.throw('custom', { message: 'FALTA EL VALOR' });
            if (!type) system.throw('custom', { message: 'TARJETA O EFECTIVO?' });
            document.getElementById(`bonus_pay_amount_${bonusId}`).value = '';
            this[`type_${bonusId}`].value = '';
            const amount = Number(value);
            const bonus = bonuses.find(b => b._id === bonusId);
            const p1 = {
                api: 'cash',
                method: 'post',
                amount: amount,
                clientId: id,
                date: Date.now(),
                type: type,
                user: system.store.users[0],
                description: `PAGO PARTE BONO ${bonus.title}`
            };
            const t = await thread.execute('rest-api', p1);
            const p2 = {
                api: `bonus/${bonusId}`,
                method: 'put',
                transactionId: bonus.transactionId + `,${t._id}`,
                payed: bonus.payed + amount
            };
            await thread.execute('rest-api', p2);
        };

        v.get('wrapper').deleteBonus = async function (bonusId) {
            const bonus = bonuses.find(b => b._id === bonusId);
            if (confirm(`Estas Seguro de eliminar este bono "${bonus.title}"`)) {
                const trs = bonus.transactionId.split(',').map(i => i.trim());
                for (let i = 0; i < trs.length; i++) {
                    await thread.execute('rest-api', {
                        api: `cash/${trs[i]}`,
                        method: 'delete'
                    });
                }
                await thread.execute('rest-api', {
                    api: `bonus/${bonusId}`,
                    method: 'delete'
                });
            }
        };

    };

    function createTab(bonus) {
        const used = bonus.transactions
            .filter(i => i.treatmentId)
            .map((i) => {
                return { id: i.treatmentId, created: i.created };
            });
        const b = {
            _id: bonus._id,
            date: (new Date(bonus.created)).formatDay('dddd, dd-mm-yyyy', dayNames),
            credit: system.toCurrency(bonus.credit),
            payed: system.toCurrency(bonus.payed),
            price: system.toCurrency(bonus.price),
            isGift: bonus.credit > 0 ? 'block' : 'none',
            isBonus: bonus.credit === 0 ? 'block' : 'none',
            showCompleteBuy: bonus.price > bonus.payed ? 'block' : 'none',
            treatments: bonus.treatments
                .map(function (trId) {
                    const find = used.find(i => i.id === trId);
                    const icon = !find ? 'cancel' : 'done';
                    if (find) {
                        used.splice(used.indexOf(find), 1);
                    }
                    const treatment = system.publicDb.treatments.find(t => t.identificador === trId) || {
                        titulo: 'EL TRATAMIENTO NO EXISTE'
                    };
                    return {
                        id: trId,
                        icon,
                        date: find ? (new Date(find.created)).formatDay('dddd, dd-mm-yyyy', dayNames) : '',
                        title: treatment.titulo
                    };
                }),
            transactions: bonus.transactions
                .map(t => {
                    return {
                        date: (new Date(t.created)).formatDay('dddd, dd-mm-yyyy', dayNames),
                        amount: system.toCurrency(t.amount || 0),
                        note: t.note || '',
                        treatmentId: t.treatmentId || ''
                    };
                }),
            remainig: system.toCurrency(bonus.credit + bonus.transactions.reduce((tot, t) => tot + t.amount || 0, 0))
        };
        return HandlebarParse(bonusTpl, b);
    }

    view.destroy = function () {

    };

    return view;
}
