import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({locale, system, thread}) {
    const p = Object.assign({bonusCards: system.publicDb.bonusCards.sort((a,b) => a.title.localeCompare(b.title))}, locale.get());
    const view = HtmlView(template, style, p);
    view.style();

    view.destroy = function () {

    };

    return view;
}