import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import cardTemplate from './card.html';
import treatmentTemplate from './treatment.html';
import * as styles from './index.scss';

function bonusCards({ system }) {
    return async function ({ parent, db }) {
        const obj = {};
        const view = HtmlView(template, styles, {});
        const locale = await system.locale(`/localization/bonusCard/es.json`);
        await locale.load(`/localization/common/es.json`);

        system.store.bonusCards.forEach(item => {
            const treatments = item.tratamientos.length ?
                item.tratamientos.split('|')
                    .map(i => i.trim())
                    .map(i => {
                        const arr = i.match(/(\d*)x(.*)/);
                        return {
                            id: arr[2],
                            count: Number(arr[1])
                        }
                    }) : [];

            const newItem = system.getStorage('bonusCards').indexOf(item.identificador) === -1
                ? locale.get('newItemTemplate') : '';

            const card = view.appendTo('products', cardTemplate, null, Object.assign({ card: item, newItem }, locale.get()));
            treatments.forEach(function (t) {
                const title = system.store.treatments.filter(i => i.identificador == t.id)[0].titulo.toUpperCase();
                const variables = Object.assign({}, { count: t.count, title }, locale.get());
                card.appendTo('treatments', treatmentTemplate, [], variables)
            });
        });

        view.get('products').add = function (id) {
            system.store.cart.push(id);
        };

        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        obj.destroy = function () {
            system.setStorage({ bonusCards: system.store.bonusCards.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
        };

        parent.appendChild(view.get());

        return obj;
    }
}

plugin(bonusCards);