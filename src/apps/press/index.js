import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import pressTemplate from './press.html';

function press({ system }) {
    return async function ({ parent, db, thread }) {
        let obj = {};
        const locale = await system.locale(`/localization/common/${system.info().lang}.json`);
        await locale.load('/localization/static.json');
        const view = HtmlView(template, styles, locale.get());

        const press = system.store.press.slice(0)
            .sort((a, b) => {
                const a1 = thread.execute('utils/string-date-to-time', { date: a.fecha });
                const b1 = thread.execute('utils/string-date-to-time', { date: b.fecha });
                return b1 - a1;
            });

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ press: system.store.press.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
        };

        obj.loadContent = async function () {
            if (press.length) {
                const item = press.splice(0, 1)[0];
                const newItem = system.getStorage('press').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                view.appendTo('press', pressTemplate, [], Object.assign({ item, newItem }, locale.get()));
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        obj.navigateTo = function (subpath) {
            const item = system.store.press.find(i => i.href === subpath);
            if (item) {
                const newItem = system.getStorage('press').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                view.clear('press').appendTo('press', pressTemplate, [], Object.assign({
                    item,
                    newItem
                }, locale.get()));
            }
        };

        return obj;
    };
}

plugin(press);