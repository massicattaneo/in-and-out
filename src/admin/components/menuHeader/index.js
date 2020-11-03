import { HtmlView } from 'gml-html';
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

    window.rx.connect({ t: () => system.store.spainTime }, function ({ t }) {
        const spainStartTime = new Date(t).toLocaleString('es-ES', {
            timeZone: 'Europe/Madrid',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });

        view.get('spaintime').innerText = `Malaga: ${spainStartTime}`;
    });

    return view;
}
