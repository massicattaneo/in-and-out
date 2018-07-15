import { plugin } from 'gml-system';
import { HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import promotionTemplate from './promotion.html';
import buyTpl from './buyTpl.html';
import { getDiscountsItems, getDiscountsPrice, getPromotionDiscounts } from '../../../web-app-deploy/shared';

function promotions({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/common/es.json`);
        await locale.load('/localization/static.json');
        const view = HtmlView(template, styles, locale.get());
        const promotionsList = system.store.promotions
            .filter(function (i) {
                const date = Date.now();
                const to = (new Date(i.hasta.split('/').reverse().join('-')));
                to.setHours(23, 59, 59, 59);
                return date <= to.getTime();
            })
            .slice(0);

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ promotions: system.store.promotions.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
        };

        obj.loadContent = async function () {
            if (promotionsList.length) {
                const item = promotionsList.splice(0, 1)[0];
                const newItem = system.getStorage('promotions').indexOf(item.identificador) === -1 ? locale.get('newItemTemplate') : '';
                const discounts = getPromotionDiscounts(item);
                const price = getDiscountsPrice(system.store, discounts);
                const cartIds = getDiscountsItems(discounts);
                const bonusBuy = item.discounts ? buyTpl.replace('{{price}}', price ? system.toCurrency(price) : '').replace('{{ids}}', JSON.stringify(cartIds)) : '';
                view.appendTo('promotions', promotionTemplate, [], Object.assign({
                    item,
                    newItem,
                    bonusBuy: (Date.now() > (new Date(item.desde.split('/').reverse().join('-')))) && price ? bonusBuy : ''
                }, locale.get()));
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        view.get('promotions').add = function (ids) {
            system.store.cart.push(...ids);
        };

        obj.navigateTo = function (subpath) {
            obj.loadContent();
            // const item = system.store.promotions.find(i => i.href === subpath);
            // if (item) {
            //     const newItem = system.getStorage('promotions').indexOf(item.identificador) === -1
            //         ? locale.get('newItemTemplate') : '';
            //     view.clear('promotions').appendTo('promotions', promotionTemplate, [], Object.assign({
            //         item,
            //         newItem
            //     }, locale.get()));
            // }
        };

        return obj;
    };
}

plugin(promotions);
