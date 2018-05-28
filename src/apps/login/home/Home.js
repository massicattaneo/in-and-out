import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './home.html';
import * as styles from './home.scss';

export default async function ({ system, parent }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/login/es.json`);

    const view = HtmlView(template, styles, locale.get());
    const form = view.get('wrapper');

    form.register = system.navigateTo.partial(`crear`);
    form.login = system.navigateTo.partial(`entrar`);
    form.recover = system.navigateTo.partial(`recuperar`);

    const disconnect = window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
        view.style(orientation);
    });

    obj.destroy = function () {
        disconnect();
    };

    parent.appendChild(view.get());

    return obj;
}
