import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './register.html';
import * as styles from './register.scss';
import registerDone from './register-done.html';

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const telRegEx = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
export default async function ({ system, parent, thread }) {
    let obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/login/es.json`);
    await locale.load(`/localization/common/es.json`);

    const view = HtmlView(template, styles, locale.get());

    view.get('mailform').register = async function () {
        if (view.get('name').value === '') error({ text: 'missingName', focus: 'name' });
        if (view.get('surname').value === '') error({ text: 'missingSurname', focus: 'surname' });
        if (view.get('email').value === '') error({ text: 'missingEmail', focus: 'email' });
        if (!emailRegEx.test(view.get('email').value)) error({ text: 'malformedEmail', focus: 'email' });
        if (view.get('password').value === '') error({ text: 'missingPassword', focus: 'password' });
        if (view.get('tel').value === '') error({ text: 'missingTel', focus: 'tel' });
        if (!telRegEx.test(view.get('tel').value)) error({ text: 'malformedTel', focus: 'tel' });
        if (!view.get('privacy').checked) error({ text: 'privacyNotAccepted', focus: 'privacy' });
        await register();
    };

    const disconnect =
        window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
            view.style(orientation);
        });

    obj.get = view.get;

    parent.appendChild(view.get());

    async function register() {
        system.store.loading = true;
        await thread.execute('user/register', {
            email: view.get('email').value,
            password: view.get('password').value,
            name: view.get('name').value,
            surname: view.get('surname').value,
            tel: view.get('tel').value,
            lang: system.info().lang
        });
        system.store.loading = false;
        view.clear().appendTo('', registerDone, [], locale.get());
    }

    function error({ text, focus }) {
        view.get(focus).focus();
        system.throw(text);
    }

    obj.destroy = function () {
        disconnect();
    };

    return obj;
}
