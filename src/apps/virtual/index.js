import { plugin } from 'gml-system';
import { HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function virtual({ system }) {
    return async function ({ parent }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/location/es.json`);

        const view = HtmlView(template, styles, locale.get());

        const disconnect =
            window.rx.connect({ deviceType: () => system.deviceInfo().deviceType }, function ({ deviceType }) {
                view.style(deviceType);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnect();
        };

        obj.navigateTo = (center) => {
            switch (center) {
                case 'salitre':
                    view.appendTo('wrapper', '<iframe width=\'100%\' height=\'100%\' src=\'https://my.matterport.com/show/?m=KUkUaazEYxB\' frameborder=\'0\' allowfullscreen allow=\'xr-spatial-tracking\'></iframe>');
                    break;
                case 'buenaventura':
                    view.appendTo('wrapper', '<iframe width=\'100%\' height=\'100%\' src=\'https://my.matterport.com/show/?m=uBNjkhWBENA\' frameborder=\'0\' allowfullscreen allow=\'xr-spatial-tracking\'></iframe>');
                    break;
            }
        };

        return obj;
    };
}

plugin(virtual);
