import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function beautycorner({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/beautycorner/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const deviceType = system.deviceInfo().deviceType === 'unknown' ? 'desktop' : system.deviceInfo().deviceType;

        system.store.allPhotos
            .filter(i => i.folder === 'beautycorner')
            .filter(p => p.url.indexOf(`${deviceType}.`) !== -1)
            .filter((a, i) => i < 3)
            .forEach((item, index) => view.get(`image${index}`).src = item.url);

        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect()
        };

        return obj;
    }
}

plugin(beautycorner);