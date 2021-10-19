import { HtmlView } from 'gml-html';
import template from './template.html';
import list from './cash-list.html';
import * as style from './style.scss';
import * as listStyle from './list.scss';
import editCash from './edit-cash.html';
import editDeposit from './edit-deposit.html';
import { createModal } from '../../utils';
import { fillSelectWithClients } from './utils';

const IVA = 21;

export default async function({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);
    let from, to;
    const model = window.rx.create({ date: Date.now() });
    view.get('date').valueAsDate = new Date(model.date);
    view.get('wrapper').change = function() {
        model.date = new Date(view.get('date').valueAsDate).getTime();
    };

    window.rx.connect({ width: () => system.deviceInfo().width }, function({ width }) {
        view.style('', { footer: { left: width > 1024 ? 240 : 0 } });
    });

    window.rx.connect({ 
        cash: () => system.store.cash 
    }, function({ cash }) {
            const filter = cash.filter(filterCash());
            const v = view.clear('cash').appendTo('cash', list, listStyle, {
                cash: filter
                    .sort((a, b) => b.date - a.date)
                    .map(i => {
                        return {
                            color: i.amount < 0 ? '#ffbebe' : '',
                            description: i.description.toUpperCase(),
                            type: i.type.toUpperCase(),
                            amount: system.toCurrency(i.amount),
                            _id: i._id,
                            date: new Date(i.date).formatTime('hh:mm')
                        };
                    })
            });
            const total = filter.reduce((t, i) => t + i.amount, 0);
            const net = total / ((100 + IVA) / 100);
            view.get('creditcards').innerText = `TARJETAS: ${system.toCurrency(filter.reduce((t, i) => t + (i.type === 'tarjeta' ? i.amount : 0), 0))}`;
            view.get('total').innerText = `TOTAL GROS: ${system.toCurrency(total)}`;
            view.get('net').innerText = `TOTAL NET: ${system.toCurrency(net)}`;
            view.get('iva').innerText = `TOTAL IVA: ${system.toCurrency(total - net)}`;
            v.style();
        });

    window.rx.connect({ actualCash: () => system.store[`cash-${system.store.users[0]}`] }, ({ actualCash }) => {
        view.get('actualcash').innerHTML = system.toCurrency(actualCash)
    })

    window.rx.connect({ date: () => model.date }, async function({ date }) {
            from = new Date(date);
            from.setHours(1, 0, 0, 0);
            to = new Date(date);
            to.setHours(23, 59, 59, 59);
            const item = await thread.execute('rest-api', {
                api: `cash?date>${from.getTime()}&date<${to.getTime()}`,
                method: 'get'
            });
            system.store.cash.splice(0, system.store.cash.length);
            system.store.cash.push(...item);
        });

    view.get('wrapper').delete = async function(id) {
        if (confirm('seguro?')) {
            await thread.execute('rest-api', {
                api: `cash/${id}`,
                method: 'delete'
            });
        }
    };

    view.get('wrapper').update = async function(id) {
        const p = system.store.cash.find(i => i._id === id);
        p[p.type] = 'checked';
        p.users = system.store.users;
        const { modalView, modal } = createModal(editCash, p,
            async function(close) {
                if (!this.description.value) system.throw('custom', { message: 'FALTA LA DESCRIPCION' });
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA O EFECTIVO?' })
                if (this.date.valueAsNumber > Date.now()) system.throw('custom', { message: 'NO PUEDE SER UNA FECHA FUTURA' })
                await thread.execute('rest-api', {
                    api: `cash/${id}`,
                    method: 'put',
                    date: this.date.valueAsNumber,
                    clientId: this.clientId.value,
                    description: this.description.value,
                    amount: Number(this.amount.value),
                    type: this.type.value,
                    user: this.user.value
                });
                close();
            });
        modalView.get('date').valueAsNumber = new Date(p.date).getTime();
        modalView.get('user').value = p.user;
        const trans = system.store.cash.find(t => t._id === id);
        fillSelectWithClients(modalView.get('client'), system, trans ? trans.clientId : '');
    };

    view.destroy = function() {

    };

    view.get('wrapper').deposit = function() {
        const { modalView, modal } = createModal(editDeposit, { users: system.store.users }, async function(close) {
            if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
            if (this.date.valueAsNumber > Date.now()) system.throw('custom', { message: 'NO PUEDE SER UNA FECHA FUTURA' })
            await thread.execute('rest-api', {
                api: 'cash',
                method: 'post',
                date: this.date.valueAsNumber,
                description: 'Deposito en Banco',
                isDeposit: true,
                amount: - Number(this.amount.value),
                type: 'efectivo',
                user: this.user.value
            });
            close();
        });
        modalView.get('date').valueAsNumber = (new Date()).getTime();
        modalView.get('amount').focus();
    };

    view.get('wrapper').add = function() {
        const { modalView, modal } = createModal(editCash, { users: system.store.users }, async function(close) {
            if (!this.description.value) system.throw('custom', { message: 'FALTA LA DESCRIPCION' });
            if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
            if (!this.type.value) system.throw('custom', { message: 'TARJETA O EFECTIVO?' });
            if (this.date.valueAsNumber > Date.now()) system.throw('custom', { message: 'NO PUEDE SER UNA FECHA FUTURA' })
            await thread.execute('rest-api', {
                api: 'cash',
                method: 'post',
                date: this.date.valueAsNumber,
                clientId: this.clientId.value,
                description: this.description.value,
                amount: Number(this.amount.value),
                type: this.type.value,
                user: this.user.value
            });
            close();
        });

        modalView.get('date').valueAsNumber = (new Date()).getTime();
        modalView.get('description').focus();
        modalView.get('description').setSelectionRange(0, modalView.get('description').value.length);
        fillSelectWithClients(modalView.get('client'), system);
    };

    function filterCash() {
        return function(item) {
            if (system.store.users.indexOf(item.user) === -1) return false;
            return true;
        };
    }

    return view;
}
