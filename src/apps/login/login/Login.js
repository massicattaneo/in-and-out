import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './login.html';
import * as styles from './login.scss';

export default async function ({ system, parent, thread }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/common/${system.info().lang}.json`);
    await locale.load(`/localization/login/${system.info().lang}.json`);

    const view = HtmlView(template, styles, locale.get());

    const disconnect =
        window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
            view.style(orientation);
        });

    parent.appendChild(view.get());

    view.get('mailform').login = async function login(e) {
        const data = {
            password: view.get('password').value,
            email: view.get('email').value,
            lang: system.info().lang,
        };
        await thread.execute('user/login', data);
        system.store.logged = true;
        system.navigateTo(locale.get('urls.home'));
    };

    obj.destroy = function () {
        disconnect();
    };

    return obj;
}
