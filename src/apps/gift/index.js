import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function gift({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/gift/es.json`);
        const view = HtmlView(template, styles, locale.get());


        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        view.get().add = function(id) {
            system.store.cart.push(id);
        };

        obj.destroy = function () {
            disconnect();
        };

        return obj;
    };
}

plugin(gift);
