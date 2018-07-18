import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function blog({ system }) {
    return async function ({ parent, context, thread }) {
        let obj = {};

        const arr = context.lastUrlVisited.split('/').filter(i => i);
        const post = await thread.execute('utils/retrieve-posts', { post: arr[arr.length - 1] });

        const params = {
            title: post.post_title || 'IN&OUT - CENTRO DE BELLEZA EN MALAGA',
            date: new Date(post.post_date || Date.now()).formatDay('dd/mm/yyyy'),
            images: post.images || [],
            content: post.post_content || `No hemos encontrado ningun contenido que corresponda a tu busqueda: 
                <strong>
                ${decodeURI(location.pathname.replace('/es/', '').replace(/-/g, ' '))}
                </strong>.
                Visita nuestro sitio
                y podras econtrar mas informaciones sobre nuestros tratamientos y productos.`
        };
        const view = HtmlView(template, styles, params);


        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect();
        };

        return obj;
    };
}

plugin(blog);