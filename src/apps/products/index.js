import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import treatmentTemplate from './products.html';
import * as styles from './index.scss';
import Menu from '../../public/components/menu/Menu';

function products({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/products/es.json`);
        await locale.load(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const menu = await Menu(view.get('menu'), { system, table: 'products', column: 'marca' });

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ products: system.store.products.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect()
        };

        view.get('products').add = function (id) {
            system.store.cart.push(id);
        };

        obj.navigateTo = async function (e) {
            switch (e) {
            case undefined:
                await menu.open();
                view.get('products').innerHTML = '';
                break;
            default:
                await menu.close(decodeURI(e));
                addProducts(menu.path(decodeURI(e)));
                return;
            }
        };

        function addProducts(type) {
            system.store.products
                .filter(item => item.marca === type)
                .forEach(item => {
                    view.appendTo('products', treatmentTemplate, [], Object.assign({
                        percentage: system.deviceInfo().deviceType === 'mobile' ? '100%' : '40%',
                        margin: system.deviceInfo().deviceType === 'mobile' ? '0 0 10px 0' : '0 10px 0 0',
                        newItem: system.getStorage('products').indexOf(item.identificador) === -1 ? locale.get('newItemTemplate') : '',
                        callDisplay: item.disponible !== 'si' ? 'inline-block' : 'none',
                        addCartDisplay: item.disponible === 'si' ? 'inline-block' : 'none',
                        item
                    }, locale.get()));
                });
        }

        return obj;
    }
}

plugin(products);