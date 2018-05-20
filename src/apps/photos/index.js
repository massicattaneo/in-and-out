import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import {RetryRequest} from "gml-http-request";

function photos({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/photos/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const photos = system.store.photos.slice(0);
        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ photos: system.store.photos.map(i => i.url) });
            system.store.notifications = Math.random();
            disconnect()
        };

        obj.loadContent = async function () {
            if (photos.length) {
                const photo = photos.splice(0, 1)[0];
                await system.loadStageFiles(photo.url).start();
                view.get('photos').appendChild(Node(`<div class="box"><img src="${photo.url}?v=${system.info().version}"</div>`))
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        return obj;
    }
}

plugin(photos);