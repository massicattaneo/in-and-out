import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import templateEs from './index_es.html';
import templateEn from './index_en.html';
import * as styles from './index.scss';

function questions({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);

        const view = HtmlView(system.info().lang === 'es' ? templateEs : templateEn, styles, locale.get());

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

plugin(questions);