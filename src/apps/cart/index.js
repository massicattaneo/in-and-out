import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import emptyCartHtml from './empty-cart.html';
import cartItemTemplate from './cart-item.html';
import cartTemplate from './cart.html';
import buyTemplate from './buy.html';
import Icon from '../../public/components/icon/icon';
import stripeStyle from './stripeStyle';
const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function cart({ system }) {
    return async function ({ parent, thread, context }) {
        let obj = {};
        let cartView;
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/common/es.json`);
        await locale.load(`/localization/cart/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const stored = {
            'TRT': 'treatments',
            'TAR': 'bonusCards'
        };

        if (system.info().addCart) {
            system.store.cart.splice(0, system.store.cart.length);
            system.store.cart.push(system.info().addCart);
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
            ({
                orientation: () => system.deviceInfo().orientation
            })
                .reactive()
                .connect(function ({ orientation }) {
                    view.style(orientation);
                });

        function groupItems(array) {
            return array
                .reduce((arr, id) => {
                    const filter = arr.filter(i => i.id === id);
                    if (filter.length) {
                        filter[0].count++;
                    } else {
                        const type = stored[id.substr(0, 3)];
                        const t = system.store[type].filter(i => i.identificador == id)[0];
                        arr.push({
                            id,
                            count: 1,
                            title: `${t.tipo ? `${t.tipo}: ` : ''}${t.titulo}`,
                            price: Number(t.precio),
                            type
                        })
                    }
                    return arr;
                }, []).sort((a, b) => a.title > b.title);
        }

        view.get('products').add = function (id, num) {
            if (num > 0) {
                system.store.cart.push(id)
            } else {
                system.store.cart.splice(system.store.cart.indexOf(id), 1)
            }
        };

        function drawCart(cart) {
            let type = '';
            const total = system.toCurrency(groupItems(cart).reduce((tot, i) => tot + (i.count * i.price), 0));
            const userEmail = system.store.email;
            cartView = view.clear('products').appendTo('products', cartTemplate, [], { total, userEmail });
            groupItems(cart)
                .sort((a, b) => a.type > b.type)
                .map(item => {
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
        }

        const discCart =
            ({
                cart: () => system.store.cart
            })
                .reactive()
                .connect(function ({ cart }) {
                    (cart.length) ? drawCart(cart) : emptyCart();
                    view.get('pay').style.display = cart.length ? 'block' : 'none';
                });

        obj.destroy = function () {
            disconnect();
            discCart();
        };

        parent.appendChild(view.get());


        // const stripe = Stripe('pk_test_gPjcEmmMg0jWcuU6BA44q2Em');
        const stripe = Stripe('pk_live_2STcLq3AN81f1gSQgJ8YBpss');
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
            event.preventDefault();
            if (cartView.get('email').value === '') system.throw('missingEmail');
            if (!emailRegEx.test(cartView.get('email').value)) system.throw('malformedEmail');
            system.store.loading = true;
            const { token, error } = await stripe.createToken(stripeCard);
            if (error) {
                system.store.loading = false;
                system.throw('custom', error);
            } else {
                const cart = system.store.cart.slice(0);
                view.get('products');
                const item = await thread.execute('cart/pay', {
                    email: view.get('products').email.value,
                    cart,
                    token: token.id
                });
                system.store.cart.splice(0, system.store.cart.length);
                setTimeout(function () {
                    system.store.loading = false;
                    view.clear('products').appendTo('products', buyTemplate, [], Object.assign({ item }, locale.get()));
                }, 100);
            }
        });

        return obj;
    }
}

plugin(cart);