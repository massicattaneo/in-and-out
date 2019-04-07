import { HtmlView } from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style('', {
        logo: {
            backgroundImage: 'url(/assets/images/manzana.svg)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain'
        }
    });

    window.rx.connect({t: () => system.store.spainTime}, function ({ t }) {
        view.get('spaintime').innerText = `Malaga: ${new Date(t + 120 * 60000).formatDay('dd/mm')}, h${new Date(t + 120 * 60000).formatTime('hh:mm:ss')}`
    })

    return view;
}
