import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    window.rx.connect({ loading: () => system.store.loading }, function ({ loading }) {
        view.get('progress').style.opacity = loading ? 1 : 0;
    });

    view.get('wrapper').change = function () {
        window.event.preventDefault();
        system.store.search = this.search.value.toLowerCase();
    };

    view.get('wrapper').logout = async function () {
        system.cookies.removeItem('users', '/');
        system.store.logged = false;
        await thread.execute('user/logout');
        system.navigateTo('/admin/es/entra');
    };

    view.setTitle = function (title) {
        view.get('title').innerHTML = title;
    };

    return view;
}