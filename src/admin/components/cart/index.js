import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import { getCartTotal } from '../../../../web-app-deploy/shared';
import { getCartFullList, getColor, getId, getDiscountedItems, getFormattedTotal } from './utils';
import editCash from '../cash/edit-cash.html';
import { createModal } from '../../utils';
import { fillSelectWithClients } from '../cash/utils';
import EventEmitter from 'gml-event-emitter';
import addBarCode from './add-barcode.html';

export default async function ({ locale, system, thread }) {
    const params = Object.assign({  }, locale.get(), system.publicDb);
    const view = HtmlView(template, style, params);
    const discountedItems = getDiscountedItems(system);
    const list = getCartFullList(system, discountedItems)
    const em = EventEmitter();

    view.style();

    const carts = []
    const settings = { selectedCartId: undefined, search: [] }

    const barcode = {
        reading: false,
        value: '',
        timeout: null
    };
    window.addEventListener('keyup', ev => {
        clearTimeout(barcode.timeout);
        if (barcode.reading && ev.key === 'Enter' && barcode.value.length >= 3) {
            const value = barcode.value;
            barcode.value = '';
            em.emit('barcode', value);
        }
        barcode.value += ev.key;
        barcode.reading = true;
        barcode.timeout = setTimeout(() => {
            barcode.reading = false;
            barcode.value = '';
        }, 300);
    });

    em.on('barcode', value => {
        const isThisRoute = location.pathname === locale.get('urls.cart.href');
        const isHistoryRoute = location.pathname === locale.get('urls.history.href');
        const item = system.publicDb.barcodes.find(code => code.barcodes.includes(value))
        if (item && isThisRoute) {
            if (!carts.length) form.addCart()
            form.addToCart(item.itemKey)
        } else if (item && isHistoryRoute) {
            const clientId = new URLSearchParams(location.search).get('id');
            view.addCart(clientId, `${location.pathname}${location.search}`);
            form.addToCart(item.itemKey);
            system.navigateTo(locale.get('urls.cart.href'));
        } else if (item) {
            view.addCart('', `${location.pathname}${location.search}`);
            form.addToCart(item.itemKey);
            system.navigateTo(locale.get('urls.cart.href'));
        } else {
            system.throw('custom', { message: 'CODIGO NO ENCONTRADO' });
        }
    });

    const form = view.get('wrapper');
    form.addCart = (clientId, redirectUrl) => {
        const id = getId(carts);
        const client = system.store.clients.find(c => c._id === clientId);
        const title = client ? `${client.name || ''} ${client.surname || ''}` : `CESTA ${id}`;
        carts.push({ title: title, id, cart: [], clientId, redirectUrl })
        if (settings.selectedCartId === undefined) {
            settings.selectedCartId = id;
        }
        refresh();
        return id;
    }
    
    form.addToCart = (identificador) => {
        if (settings.selectedCartId === undefined) {
            form.addCart()
        }
        const cart = carts.find(item => item.id === settings.selectedCartId);
        cart.cart.push(identificador);
        refresh();
    }

    form.addBarCode = (identificador) => {
        const item = list.find(item => item.id === identificador)
        const { modalView, modal } = createModal(addBarCode, item,
            async function (close) {
                if (!this.barcode.value) system.throw('custom', { message: 'FALTA EL CODIGO DE BARRAS' });
                if (this.barcode.value.length < 3) system.throw('custom', { message: 'EL CODIGO DE BARRAS NECESITA 3 LETRAS MINIMO' });
                const res = await thread.execute('rest-api', {
                    api: 'barcodes',
                    method: 'post',
                    itemKey: identificador,
                    barcode: this.barcode.value
                });
                close();
            });
            modalView.get('barcode').focus();
    }

    form.cartToCash = () => {
        if (settings.selectedCartId === undefined) return;
        const { cart = [], clientId: startClientId, redirectUrl } = carts.find(item => item.id === settings.selectedCartId) || {};
        if (!cart.length) return;
        const props = { users: system.store.users };
        const { modalView, modal } = createModal(editCash, props,
            async function(close) {
                const bonuses = cart.filter(item => item.startsWith('TAR-'));
                if (!this.amount.value) system.throw('custom', { message: 'FALTA EL VALOR' });
                if (!this.type.value) system.throw('custom', { message: 'TARJETA O EFECTIVO?' });
                if (bonuses.length && !this.clientId.value) system.throw('custom', { message: 'TIENES QUE SELECIONAR UN USARIO PARA VENDER UN BONO' });
                const date = this.date.valueAsNumber;
                if (date > Date.now()) system.throw('custom', { message: 'NO PUEDE SER UNA FECHA FUTURA' })
                const clientId = this.clientId.value;
                const cartTotal = getCartTotal(system.publicDb, cart).total;
                const discount = Number(this.amount.value) / cartTotal;
                let discountSum = cartTotal - Number(this.amount.value);
                await Promise.all(cart.map(async (id, cartIndex) => {
                    const isBonus = id.startsWith('TAR-');
                    const originalAmount = getCartTotal(system.publicDb, [id]).total;
                    const amount = (cartIndex === cart.length -1) ? originalAmount - discountSum : originalAmount * discount;
                    discountSum -= originalAmount - amount;
                    const transaction = await thread.execute('rest-api', {
                        api: `cash`,
                        method: 'post',
                        date: date,
                        clientId,
                        description: list.find(i => i.id === id).title,
                        amount: amount,
                        type: this.type.value,
                        user: this.user.value,
                        itemKey: id,
                        originalAmount
                    });
                    if (isBonus) {
                        const bonus = system.publicDb.bonusCards.find(i => i.id === id);
                        await thread.execute('rest-api', {
                            api: 'bonus',
                            method: 'post',
                            clientId,
                            created: date,
                            credit: bonus.credit,
                            payed: originalAmount,
                            price: originalAmount,
                            finished: false,
                            title: bonus.title,
                            transactionId: transaction._id,
                            transactions: [],
                            treatments: bonus.treatments
                        });
                    }
                }));
                close();
                form.removeCart();
                const hasBonus = cart.some(id => id.startsWith('TAR-'));
                if (hasBonus) 
                    system.navigateTo(`${locale.get('urls.history.href')}?id=${clientId}`);
                else if (redirectUrl) 
                    system.navigateTo(redirectUrl);
                if (location.pathname !== locale.get('urls.cart.href'))
                    system.throw('custom', { message: 'CAJA ANADIDA CORRECTAMENTE', green: true });
            });
        modalView.get('date').valueAsNumber = Date.now();
        modalView.get('amount').value = getCartTotal(system.publicDb, cart).total;
        modalView.get('descriptionwrapper').style.display = 'none';
        modalView.get('amountnote').innerHTML = 'CAMBIANDO EL VALOR SE APLICARA\' UN DESCUENTO.';
        modalView.get('user').value = system.store.users[0];
        modalView.get('amount').focus();
        fillSelectWithClients(modalView.get('client'), system, startClientId);
    }

    form.removeCart = () => {
        if (settings.selectedCartId !== undefined) {
            const find = carts.find(item => item.id === settings.selectedCartId);
            carts.splice(carts.indexOf(find), 1);
            if (carts.length) {
                settings.selectedCartId = carts[0].id
            } else {
                settings.selectedCartId = undefined;
            }
            refresh();
        }
    }

    form.removeFromCart = id => {
        if (settings.selectedCartId === undefined) return;
        const cart = carts.find(item => item.id === settings.selectedCartId);
        cart.cart.splice(cart.cart.indexOf(id), 1);
        refresh();
    }

    form.selectTab = (event, id) => {
        event.preventDefault();
        settings.selectedCartId = id;
        refresh();
    }

    form.search = (event, el) => {

        settings.search = [...el.value.toLowerCase().replace(/\s\s/g, ' ').split(' ')];
        refreshList();
    }

    const refresh = () => {
        view.renderToDOM('cartsbuttons', () => {
            return `<div>
            ${carts.map(({ id, title }) => {
                const isSelected = id === settings.selectedCartId;
                return `<button 
                style="background-color: ${isSelected ? 'green' : 'inherit'}; color: ${isSelected ? 'white' : 'inherit'};" 
                onclick="this.form.selectTab(event, ${id})">
                    ${title}
                </button>`
            }).join('')}
            <hr/>
            </div>`;
        })
        view.renderToDOM('cart', () => {
            const { cart } = carts.find(item => item.id === settings.selectedCartId) || {};
            if (!cart) return '<div>NINGUNA CESTA</div>';
            const cartTotal = getCartTotal(system.publicDb, cart);
            return `<div>
            <table cellspacing="0" cellpadding="3" width="100%"> 
                ${cart.map(id => {
                    const cartItem = list.find(item => item.id === id);
                    return `
                    <tr>
                        <td>
                        <button type="button" onclick="this.form.removeFromCart('${id}')" >
                            <i class="material-icons">delete</i>
                        </button>
                        </td>
                        <td>${cartItem.label.substr(0,4)}</td>
                        <td>${cartItem.title}</td>
                        <td style="text-align: right;">${getFormattedTotal(system, discountedItems, id)}</td>
                    </tr>`;
                }).join('')}
                <tr><td colspan="4"><hr/></td></tr>
                <tr>
                <td colspan="3">DESCUENTO APLICADO:</td>
                <td width="60px" style="font-size: 11px; text-align: right;">${system.toCurrency(cartTotal.discount)}</td>
                </tr>
                <tr>
                <td colspan="3"><strong>TOTAL:</strong></td>
                <td width="60px" style="text-align: right;">
                <strong>${system.toCurrency(cartTotal.total)}</strong>
                </td>
                </tr>
            </table>
            </div>`;
        })
        componentHandler.upgradeDom();
    }

    refresh()

    const refreshList = () => {
        view.renderToDOM('list', () => {
            const filtered = list
                .filter(item => {
                    if (!settings.search.length) return true;
                    const found = settings.search.filter(string => item.title.toLowerCase().indexOf(string) !== -1).length
                    return found === settings.search.length;
                });
            if (!filtered.length) return '<div style="width: 100%;">NINGUN RESULTADO</div>'
            return `<div style="overflow: scroll; height: 100%;"><table cellspacing="0" cellpadding="3">
                ${filtered.map(prod => {
                return `<tr style="background-color: ${getColor(prod)}">
                    <td>
                        <button type="button" onclick="this.form.addToCart('${prod.id}')" 
                        class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent">
                        <i class="material-icons">add</i>
                    </button>
                    </td>
                    <td>
                        <button type="button" onclick="this.form.addBarCode('${prod.id}')" >
                            <i class="material-icons">flip</i>
                        </button>
                    </td>
                    <td><strong>${prod.label}</strong></td>
                    <td><em>${prod.title}</em></td>
                    <td>${prod.quantity}</td>
                    <td width="80px" style="text-align: right;"><strong>${system.toCurrency(prod.price)}</strong></td>
                </tr>`
            }).join('')}
            </table></div>`
        })
    }

    refreshList()

    view.destroy = function () {

    };

    view.update = function () {
        view.get('search').focus()
        view.get('search').setSelectionRange(0, view.get('search').value.length)
    }

    view.addCart = (clientId, redirectUrl) => {
        const id = form.addCart(clientId, redirectUrl);
        settings.selectedCartId = id;
        refresh();
    }

    view.addToCart = (id) => {
        form.addToCart(id);
        refresh();
    }

    view.cartToCash = form.cartToCash

    return view;
}
