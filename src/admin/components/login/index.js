import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    let form = view.get('wrapper');
    form.login = async function login() {
        system.store.loading = true;
        const data = {
            password: form.password.value
        };
        await thread.execute('user/adminLogin', data);
        system.store.loading = false;
        system.store.logged = true;
        system.navigateTo(locale.get('urls.homePage.href'))
    };

    view.destroy = function () {

    };

    return view;
}