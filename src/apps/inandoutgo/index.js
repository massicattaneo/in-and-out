import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function inandoutgo({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/inandoutgo/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const deviceType = system.deviceInfo().deviceType === 'unknown' ? 'desktop' : system.deviceInfo().deviceType;

        system.store.allPhotos
            .filter(i => i.folder === 'inandoutgo')
            .filter(p => p.url.indexOf(`${deviceType}.`) !== -1)
            .filter((a,i) => i < 3)
            .forEach((item, index) => {
                const image = view.get(`image${index}`);
                image.src = item.url;
                image.title = item.name;
                image.alt = item.name;
            });

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect()
        };

        return obj;
    }
}

plugin(inandoutgo);