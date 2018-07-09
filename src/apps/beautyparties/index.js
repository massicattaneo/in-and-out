import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import packTemplate from './pack.html';
import * as styles from './index.scss';

function beautyparties({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/beautyparties/${system.info().lang}.json`);
        await locale.load(`/localization/common/${system.info().lang}.json`);
        const view = HtmlView(template, styles, locale.get());

        system.store.beautyparties.forEach(item => {
            const newItem = system.getStorage('beautyparties').indexOf(item.identificador) === -1
                ? locale.get('newItemTemplate') : '';
            const list = item.tratamientos.split('|').map(i => `<li>${i.trim()}</li>`).join('');
            view.appendTo('packs', packTemplate, null, Object.assign({ newItem, list, item }, locale.get()));
        });

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ beautyparties: system.store.beautyparties.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
        };

        return obj;
    };
}

plugin(beautyparties);