import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    window.rx.connect({ loading: () => system.store.loading }, function ({ loading }) {
        view.get('progress').style.opacity = loading ? 1 : 0;
    });

    view.setTitle = function (title) {
        // view.get('title').innerHTML = title;
    };

    return view;
}