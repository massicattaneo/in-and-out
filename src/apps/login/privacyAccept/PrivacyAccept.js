import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './privacyAccept.html';
import * as styles from './privacyAccept.scss';

export default async function ({ system, parent, thread }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/login/es.json`);

    const view = HtmlView(template, styles, locale.get());

    const disconnect =
        window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
            view.style(orientation);
        });

    thread.execute('user/privacyAccept', {
        activationCode: system.info().activationCode
    });

    await locale.load(`/localization/common/es.json`);
    view.clear().appendTo('', template, [], locale.get());

    obj.destroy = function () {
        disconnect();
    };

    parent.appendChild(view.get());

    return obj;
}
