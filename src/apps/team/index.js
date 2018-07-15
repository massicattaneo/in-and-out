import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import workerTemplate from './worker.html';
import * as styles from './index.scss';

function team({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/team/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const deviceType = system.deviceInfo().deviceType === 'unknown' ? 'desktop' : system.deviceInfo().deviceType;

        function getImageUrl(name) {
            return system.store.allPhotos
                .filter(i => i.name === name && i.url.indexOf(`${deviceType}.`) !== -1)[0].url;
        }

        system.store.workers
            .filter(i => i.profileImageName)
            .forEach(function (item) {
                const des = locale.get(`user${item.id}description`);
                const description = `<p>${des instanceof Object ? '' : des}</p>`;
                const imageUrl = getImageUrl(item.profileImageName);
                const { name } = item;
                view.appendTo('workers', workerTemplate, [], { name, description: description, imageUrl });
            });

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

plugin(team);