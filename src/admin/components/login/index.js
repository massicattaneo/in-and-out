import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    const form = view.get('wrapper');

    const enterListener = async (event) => {
        event.preventDefault();
        system.store.loading = true;
        const data = {
            password: form.password.value
        };
        await thread.execute('user/adminLogin', data);
        system.store.loading = false;
        system.store.logged = true;
        window.removeEventListener('keyup', enterListener);
        system.navigateTo(locale.get('urls.homePage.href'))
    };
    form.addEventListener('submit', enterListener);

    view.destroy = function () {
        window.removeEventListener('keyup', enterListener);
    };

    return view;
}