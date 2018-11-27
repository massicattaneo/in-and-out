import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import emptyCartHtml from './empty-cart.html';
import cartItemTemplate from './cart-item.html';
import cartTemplate from './cart.html';
import buyTemplate from './buy.html';
import Icon from '../../public/components/icon/icon';
import stripeStyle from './stripeStyle';
import { getCartTotal } from '../../../web-app-deploy/shared';

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const telRegEx = /^(\+34|0034|34)?[\s|\-|\.]?[6|7|9][\s|\-|\.]?([0-9][\s|\-|\.]?){8}$/;

function cart({ system }) {
    return async function ({ parent, thread, context }) {
        let obj = {};
        let cartView;
        let hasProducts;
        let hasBonusCards;
        let hasTreatments;

        const freeChargeLimit = system.store.settings.freeChargeLimit;
        const sendingCharge = system.store.settings.sendingCharge;
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/common/es.json`);
        await locale.load(`/localization/cart/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const storeTypes = {
            'TRT': 'treatments',
            'TAR': 'bonusCards',
            'PRD': 'products'
        };

        if (system.info().addCart) {
            system.store.cart.splice(0, system.store.cart.length);
            system.store.cart.push(...system.info().addCart.split('|'));
            system.info().addCart = null;
        }

        system.store.cart.forEach(function (id) {
            if (id.startsWith('TRT') && !system.store.treatments.find(i => i.identificador === id)) {
                system.store.cart.splice(system.store.cart.indexOf(id), 1);
            }
            if (id.startsWith('TAR') && !system.store.bonusCards.find(i => i.identificador === id)) {
                system.store.cart.splice(system.store.cart.indexOf(id), 1);
            }
        });

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        function groupItems(array) {
            return array
                .reduce((arr, id) => {
                    const filter = arr.filter(i => i.id === id);
                    if (filter.length) {
                        filter[0].count++;
                    } else {
                        const type = storeTypes[id.substr(0, 3)];
                        const t = system.store[type].filter(i => i.identificador == id)[0];
                        arr.push({
                            id,
                            count: 1,
                            title: `${t.tipo ? `${t.tipo}: ` : ''}${t.titulo}`,
                            price: Number(t.precio),
                            type
                        });
                    }
                    return arr;
                }, []).sort((a, b) => a.title > b.title);
        }

        view.get('products').add = function (id, num) {
            if (num > 0) {
                system.store.cart.push(id);
            } else {
                system.store.cart.splice(system.store.cart.indexOf(id), 1);
            }
        };

        function drawCart(cart) {
            let type = '';
            const items = groupItems(cart).sort((a, b) => a.type > b.type);
            hasTreatments = items.filter(i => i.type === 'treatments').length > 0;
            hasBonusCards = items.filter(i => i.type === 'bonusCards').length > 0;
            hasProducts = items.filter(i => i.type === 'products').length > 0;
            const totalProducts = getCartTotal(system.store, cart.filter(i => i.startsWith('PRD'))).total;
            const total = getCartTotal(system.store, cart).total;
            const costs = (totalProducts >= freeChargeLimit || !hasProducts) ? 0 : sendingCharge;
            const userEmail = system.store.email;
            window.getCartTotal = a => getCartTotal(system.store, a);
            cartView = view.clear('products')
                .appendTo('products', cartTemplate, [], Object.assign({}, locale.get(), {
                    total: system.toCurrency(total + costs),
                    userEmail,
                    showDiscount: getCartTotal(system.store, cart).discount > 0 ? '' : 'none',
                    totalReal: system.toCurrency(getCartTotal(system.store, cart).real),
                    totalDiscount: system.toCurrency(getCartTotal(system.store, cart).discount),
                    freeChargeLimit: system.toCurrency(freeChargeLimit),
                    totalProducts: system.toCurrency(totalProducts),
                    costs: system.toCurrency(costs),
                    hasProducts: hasProducts ? '' : 'none',
                    showPrivacy: system.info().status.privacy ? 'none': 'block',
                    showPartialGift: hasTreatments || hasBonusCards ? 'inline-block' : 'none'
                }));
            items.map(item => {
                const typeTitleDisplay = type === item.type ? 'none' : 'block';
                const typeTitle = locale.get(`treatmentsTypes.${type = item.type}`);
                const total = system.toCurrency(item.price * item.count);
                cartView.appendTo('cart', cartItemTemplate, [], { item, total, typeTitleDisplay, typeTitle });
            });
        }

        function emptyCart() {
            const emptyView = view.clear('products').appendTo('products', emptyCartHtml);
            Icon({ system, context, parent: emptyView.get('icons'), config: { name: 'treatments' } });
            Icon({ system, context, parent: emptyView.get('icons'), config: { name: 'bonusCards' } });
            if (system.store.products.filter(p => p.disponible === 'si').length) {
                Icon({ system, context, parent: emptyView.get('icons'), config: { name: 'products' } });
            }
        }

        const discCart =
            window.rx.connect({ cart: () => system.store.cart }, function ({ cart }) {
                (cart.length) ? drawCart(cart) : emptyCart();
                view.get('pay').style.display = cart.length ? 'block' : 'none';
            });

        obj.destroy = function () {
            disconnect();
            discCart();
        };

        parent.appendChild(view.get());


        if (window.Stripe) {
            const stripe = Stripe(window.stripeKey);
            const elements = stripe.elements();

            // Custom styling can be passed to options when creating an Element.
            // (Note that this demo uses a wider set of styles than the guide below.)

            const stripeCard = elements.create('card', { style: stripeStyle });
            stripeCard.mount('#card-element');
            stripeCard.addEventListener('change', ({ error }) => {
                error && system.throw('custom', error);
            });

            const form = document.getElementById('payment-form');
            form.addEventListener('submit', async function (event) {
                console.log('paying');
                event.preventDefault();
                if (cartView.get('email').value === '') system.throw('missingEmail');
                if (!emailRegEx.test(cartView.get('email').value)) system.throw('malformedEmail');
                if (!system.info().status.privacy && !cartView.get('privacy').checked) system.throw('privacyNotAccepted');
                if (hasProducts) {
                    if (cartView.get('name').value === '') system.throw('missingName');
                    if (cartView.get('address').value === '') system.throw('missingAddress');
                    if (cartView.get('city').value === '') system.throw('missingCity');
                    if (cartView.get('cap').value === '') system.throw('missingCap');
                    if (cartView.get('tel').value === '') system.throw('missingTel');
                    if (!telRegEx.test(cartView.get('tel').value)) system.throw('malformedTel');
                }
                system.store.loading = true;
                const { token, error } = await stripe.createToken(stripeCard);
                if (error) {
                    system.store.loading = false;
                    system.throw('custom', error);
                } else {
                    const sendTo = hasProducts ? {
                        name: cartView.get('name').value,
                        address: cartView.get('address').value,
                        city: cartView.get('city').value,
                        cap: cartView.get('cap').value,
                        tel: cartView.get('tel').value,
                        isGift: view.get('products').gift.value
                    } : {};
                    const cart = system.store.cart.slice(0);
                    view.get('products');
                    const item = await thread.execute('cart/pay', {
                        email: view.get('products').email.value,
                        cart,
                        token: token.id,
                        sendTo
                    });
                    system.store.cart.splice(0, system.store.cart.length);
                    setTimeout(function () {
                        system.store.loading = false;
                        view.clear('products').appendTo('products', buyTemplate, [], Object.assign({ item }, locale.get()));
                    }, 100);
                }
            });
        }

        return obj;
    };
}

plugin(cart);
