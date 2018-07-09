import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import { isCenterClosed } from '../../../web-app-deploy/shared';

function hours({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/globalize/${system.info().lang}.json`);
        await locale.load(`/localization/hours/${system.info().lang}.json`);
        const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));

        const getClosingDays = function (centerIndex) {
            return Array.apply(null, Array(14))
                .map((o, i) => {
                    const timestamp = Date.now() + i * 24 * 60 * 60 * 1000;
                    return {
                        timestamp,
                        date: (new Date(timestamp)).formatDay('dddd, dd-mm-yyyy', dayNames),
                        closed: isCenterClosed(system.store, centerIndex, timestamp)
                    }
                }).filter(i => i.closed).filter(i => (new Date(i.timestamp)).getDay() !== 0)
        };
        const params = Object.assign({
            location1ExceptionalClosing: getClosingDays(0),
            location3ExceptionalClosing: getClosingDays(2)
        }, locale.get());
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

plugin(hours);