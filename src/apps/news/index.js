import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import newsTemplate from './news.html';
import * as styles from './index.scss';

function news({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const newsList = system.store.news.slice(0);
        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ news: system.store.news.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect()
        };

        obj.loadContent = async function () {
            if (newsList.length) {
                const item = newsList.splice(0, 1)[0];
                const newItem = system.getStorage('news').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                view.appendTo('news', newsTemplate, [], Object.assign({ item, newItem }, locale.get()));
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        obj.navigateTo = function(subpath) {
            const item = system.store.news.find(i => i.href === subpath);
            if (item) {
                const newItem = system.getStorage('news').indexOf(item.identificador) === -1
                    ? locale.get('newItemTemplate') : '';
                view.clear('news').appendTo('news', newsTemplate, [], Object.assign({item, newItem}, locale.get()));
            }
        };

        return obj;
    }
}

plugin(news);