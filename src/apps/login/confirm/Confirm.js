import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './confirm.html';
import * as styles from './confirm.scss';

export default async function ({ system, parent }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/common/es.json`);
    await locale.load(`/localization/login/es.json`);

    const view = HtmlView(template, styles, locale.get());

    const disconnect =
        window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
            view.style(orientation);
        });

    obj.destroy = function () {
        disconnect();
    };

    parent.appendChild(view.get());

    return obj;
}
