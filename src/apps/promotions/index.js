import {plugin} from 'gml-system';
import {HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import promotionTemplate from './promotion.html';
import buyTpl from './buyTpl.html';

function promotions({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/common/es.json`);
        await locale.load('/localization/static.json');
        const view = HtmlView(template, styles, locale.get());
        const promotionsList = system.store.promotions
            .filter(function(i) {
                const date = Date.now();
                const from = (new Date(i.desde.split('/').reverse().join('-')));
                const to = (new Date(i.hasta.split('/').reverse().join('-')));
                from.setHours(0,0,0,0);
                to.setHours(23,59,59,59);
                return date >= from.getTime() && date <= to.getTime()
            })
            .slice(0);

        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({promotions: system.store.promotions.map(i => i.identificador)});
            system.store.notifications = Math.random();
            disconnect()
        };

        obj.loadContent = async function () {
            if (promotionsList.length) {
                const item = promotionsList.splice(0, 1)[0];
                const newItem = system.getStorage('promotions').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                const card = system.store.bonusCards.find(i => i.identificador === item.tarjeta);
                const bonus = card ? buyTpl.replace('{{price}}', card.precio_texto).replace('{{id}}', card.identificador) : '';
                view.appendTo('promotions', promotionTemplate, [], Object.assign({item, newItem, bonus, card}, locale.get()));
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        view.get('promotions').add = function (id) {
            system.store.cart.push(id);
        };

        obj.navigateTo = function(subpath) {
            const item = system.store.promotions.find(i => i.href === subpath);
            if (item) {
                const newItem = system.getStorage('promotions').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                view.clear('promotions').appendTo('promotions', promotionTemplate, [], Object.assign({item, newItem}, locale.get()));
            }
        };

        return obj;
    }
}

plugin(promotions);