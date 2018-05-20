import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './recover.html';
import * as styles from './recover.scss';
import recoverDone from './recover-done.html';

export default async function ({ system, parent, thread }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/login/es.json`);

    const view = HtmlView(template, styles, locale.get());

    view.get('form').recover = async function () {
        await thread.execute('user/recover', { email: view.get('email').value });
        await locale.load(`/localization/common/es.json`);
        view.clear().appendTo('', recoverDone, [], locale.get());
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
