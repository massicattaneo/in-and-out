import { plugin } from 'gml-system';
import { HtmlView, Node } from 'gml-html';
import template from './index.html';
import productTemplate from './products.html';
import * as styles from './index.scss';
import { getCartTotal, isInPromotion } from '../../../web-app-deploy/shared';

function products({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/products/es.json`);
        await locale.load(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        view.get('search').style.width = 'calc(100% - 20px)';
        const store = window.rx.create({
            brand: '',
            type: ''
        });

        const storageProductsIds = system.getStorage('products');

        const products = [];

        const brands = system.store.products
            .map(item => item.marca)
            .filter((o, i, a) => a.indexOf(o) === i)
            .sort();
        brands.forEach(brand => view.get('brand').appendChild(Node(`<option value="${brand}">${brand.toUpperCase()}</option>`)));

        const types = system.store.products
            .map(item => item.categoria)
            .filter((o, i, a) => a.indexOf(o) === i)
            .sort();
        types.forEach(type => view.get('type').appendChild(Node(`<option value="${type}">${type.toUpperCase()}</option>`)));

        const disconnect =
            window.rx.connect({
                orientation: () => system.deviceInfo().orientation
            }, function ({ orientation }) {
                view.style(orientation);
            });

        const disconnect1 =
            window.rx.connect({
                logged: () => system.store.logged,
                brand: () => store.brand,
                type: () => store.type
            }, function ({ brand, type }) {
                products.length = 0;
                products.push(...system.store.products.slice(0)
                    .filter(item => !brand || item.marca === brand)
                    .filter(item => !type || item.categoria === type)
                    .sort((first, second) => {
                        if (isInPromotion(system.store.promotions, first)) return -1;
                        if (isInPromotion(system.store.promotions, second)) return 1;
                        if (!storageProductsIds.includes(first.identificador)) return -1;
                        if ((first.posicion - second.posicion) === 0) {
                            if (first.disponible === 'no' && second.disponible === 'si') return 1;
                            if (first.disponible === 'si' && second.disponible === 'no') return -1;
                            return 0;
                        }
                        return first.posicion - second.posicion;
                    }));
                view.clear('productlist');
                if (obj.loadContent) {
                    obj.loadContent();
                    obj.loadContent();
                    obj.loadContent();
                    obj.loadContent();
                    obj.loadContent();
                }
            });

        view.get('search').change = what => {
            store[what] = view.get('search')[what].value;
        };

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ products: system.store.products.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
            disconnect1();
        };

        view.get('productlist').add = function (id) {
            system.store.cart.push(id);
        };

        obj.loadContent = async function () {
            if (products.length) {
                const product = products.splice(0, 1)[0];
                await system.loadStageFiles(product.url).start();
                const shouldShowPrice = (system.store.logged || product.marca.toLowerCase() !== 'biologique recherche');
                const isPromotion = isInPromotion(system.store.promotions, product);
                const cartTotal = getCartTotal(system.store, [product.identificador]);
                view.appendTo('productlist', productTemplate, [], Object.assign({
                    percentage: system.deviceInfo().deviceType === 'mobile' ? '100%' : '40%',
                    margin: system.deviceInfo().deviceType === 'mobile' ? '0 0 10px 0' : '0 10px 0 0',
                    newItem: system.getStorage('products').indexOf(product.identificador) === -1 ? locale.get('newItemTemplate') : '',
                    loginDisplay: !shouldShowPrice && product.disponible === 'si' ? 'inline-block' : 'none',
                    callDisplay: product.disponible !== 'si' ? 'inline-block' : 'none',
                    addCartDisplay: shouldShowPrice && product.disponible === 'si' ? 'inline-block' : 'none',
                    discounted: system.toCurrency(cartTotal.total),
                    item: product,
                    showDiscount: shouldShowPrice && isPromotion ? 'inline-block' : 'none',
                    bgColor: !isPromotion ? '' : '#fae1ce',
                    textDecoration: !isPromotion ? '' : 'line-through',
                    showDiscountPromo: isPromotion ? 'inline-block' : 'none',
                    discountPercentage: `${(Math.round(cartTotal.discount / product.precio * 100)).toFixed(2)}%`
                }, locale.get()));
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        obj.navigateTo = (type, product) => {
            if (!type || !product) return;
            view.clear('productlist');
            products.length = 0;
            const item = system.store.products.find(item => item.href === product);
            products.push(item);
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
        };

        return obj;
    };
}

plugin(products);
