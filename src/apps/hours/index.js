import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function hours({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/globalize/es.json`);
        await locale.load(`/localization/hours/es.json`);

        const params = Object.assign({
            centers: Object.keys(system.store.centers).map(key => {
                return {
                    location: system.store.centers[key].address
                }
            })
        }, locale.get());
        const view = HtmlView(template, styles, params);

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect();
        };

        return obj;
    };
}

plugin(hours);