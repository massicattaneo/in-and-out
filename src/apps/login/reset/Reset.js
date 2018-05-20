import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './reset.html';
import * as styles from './reset.scss';
import resetDone from './reset-done.html';

export default async function ({ system, parent, thread }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/login/es.json`);

    const view = HtmlView(template, styles, locale.get());

    view.get('form').reset = async function () {
        thread.execute('user/reset', {
            activationCode: system.info().activationCode,
            password: view.get('password').value
        });
        await locale.load(`/localization/common/es.json`);
        view.clear().appendTo('', resetDone, [], locale.get());
    };

    const disconnect = ({ orientation: () => system.deviceInfo().orientation })
        .reactive()
        .connect(function ({ orientation }) {
            view.style(orientation);
        });

    obj.destroy = function () {
        disconnect();
    };

    parent.appendChild(view.get());

    return obj;
}
