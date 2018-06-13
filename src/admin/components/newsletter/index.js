import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    let editor;

    view.destroy = function () {

    };

    view.update = function () {
        if (!editor) {
            editor = new nicEditor({ fullPanel: true }).panelInstance(view.get('html'));
        }
    };

    view.get().send = function (test, emails) {
        const subject = view.get('subject').value;
        if (!system.store.adminLevel === 0) system.throw('custom', { message: 'NO PUEDES ENVIAR LA NEWSLETTER' });
        if (!subject) system.throw('custom', { message: 'RELLENA EL TITULO' });
        if (editor.nicInstances[0].elm.textContent.length < 10) system.throw('custom', { message: 'RELLENA EL CONTENIDO' });
        const html = editor.nicInstances[0].editorContain.children[0].innerHTML;
        if (test) {
            thread.execute('utils/send-newsletter', {
                emails: emails,
                subject,
                html
            });
        } else if (confirm('ESTAS SEGURO QUE QUIERES ENVIAR LA NEWSLETTER A TODOS?')) {
            thread.execute('utils/send-newsletter', {
                test: false,
                emails: [],
                subject,
                html
            });
        }
    };

    return view;
}