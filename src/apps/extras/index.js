import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function extras({ system }) {
    return async function ({ parent, context, thread }) {
        let obj = {};

        const arr = context.lastUrlVisited.split('/').filter(i => i);
        const post = await thread.execute('utils/retrieve-extras', { post: arr[arr.length - 1] });

        const params = post ? {
            title: post.post_title,
            date: new Date(post.post_date).formatDay('dd/mm/yyyy'),
            content: post.post_content
        } : {};
        const view = HtmlView(template, styles, params);


        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect();
        };

        return obj;
    };
}

plugin(extras);