import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function hours({ system }) {
    return async function ({parent}) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/globalize/es.json`);
        await locale.load(`/localization/hours/es.json`);

        const view = HtmlView(template, styles, locale.get());

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

plugin(hours);