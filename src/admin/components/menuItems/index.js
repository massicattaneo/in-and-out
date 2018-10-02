import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

function isAdmin(level) {
    return Number(level) === 2;
}

export default async function ({ locale, system }) {
    const view = HtmlView(template, style, locale.get());

    // window.rx.connect({ level: () => system.store.adminLevel }, function ({ level }) {
    //
    // });

    return view;
}