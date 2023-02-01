import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

function isAdmin(level) {
    return Number(level) === 2;
}

export default async function ({ locale, thread, system }) {
    const view = HtmlView(template, style, locale.get());

    view.get('form').logout = async () => {
        system.cookies.removeItem('users', '/');
        system.store.logged = false;
        await thread.execute('user/logout');
        system.navigateTo('/admin/es/entra');
        localStorage.removeItem("in-and-out-admin")
    }
    // window.rx.connect({ level: () => system.store.adminLevel }, function ({ level }) {
    //
    // });

    return view;
}