import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import cardTemplate from './card.html';
import treatmentTemplate from './treatment.html';
import * as styles from './index.scss';
import { getCartTotal, getPromotionDiscounts, sortByDate } from '../../../web-app-deploy/shared';

function bonusCards({ system }) {
    return async function ({ parent }) {
        const obj = {};
        const view = HtmlView(template, styles, {});
        const locale = await system.locale(`/localization/bonusCards/es.json`);
        await locale.load(`/localization/common/es.json`);

        const only = location.pathname.split('/')[3];

        system.store.bonusCards
            .filter(item => !only || item.href === only)
            .map(card => {
                return Object.assign({
                    treatments: card.tratamientos.length ?
                        card.tratamientos.split('|')
                            .map(i => i.trim())
                            .map(i => {
                                const arr = i.match(/(\d*)x(.*)/);
                                return Object.assign({
                                    count: Number(arr[1])
                                }, system.store.treatments.find(i => i.identificador == arr[2]));
                            }) : []
                }, card);
            })
            .sort(function (a, b) {
                if (sortByDate('desde')(a, b) === 0) {
                    if (!a.treatments.length || !b.treatments.length) return -1;
                    return a.treatments[0].tipo.toString().localeCompare(b.treatments[0].tipo.toString());
                }
                return sortByDate('desde')(a, b);
            })
            .forEach(item => {
                const { treatments } = item;
                const newItem = system.getStorage('bonusCards').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                const ps = system.store.promotions.map(getPromotionDiscounts)
                    .reduce((a,i) => a.concat(i), [])
                    .filter(i => i.items.filter(o => o.id === item.identificador).length === i.items.length).length;
                const card = view.appendTo('products', cardTemplate, null, Object.assign({
                    card: Object.assign({}, item, {
                        price: system.toCurrency(item.precio),
                        discounted: system.toCurrency(getCartTotal(system.store, [item.identificador]).total),
                        showDiscount: ps ? '' : 'none',
                        bgColor: !ps ? '' : '#ffe1e1',
                        textDecoration: !ps ? '' : 'line-through'
                    }),
                    newItem
                }, locale.get()));
                treatments.forEach(function (t) {
                    const title = t.titulo.toUpperCase();
                    const variables = Object.assign({}, { count: t.count, title , href: `${t.menuhref}/${t.href}`}, locale.get());
                    card.appendTo('treatments', treatmentTemplate, [], variables);
                });
            });

        view.get('products').add = function (id) {
            system.store.cart.push(id);
        };

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        obj.destroy = function () {
            system.setStorage({ bonusCards: system.store.bonusCards.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
        };

        parent.appendChild(view.get());

        return obj;
    };
}

plugin(bonusCards);
