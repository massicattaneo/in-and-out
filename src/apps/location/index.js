import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function location({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/location/${system.info().lang}.json`);

        const view = HtmlView(template, styles, locale.get());


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

plugin(location);