import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ locale, system, thread }) {
    const items = Object.assign(locale.get(), system.publicDb);
    const view = HtmlView(template, style, items);
    view.style();

    view.destroy = function () {

    };

    return view;
}
