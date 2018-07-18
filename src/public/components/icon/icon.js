import * as styles from './icon.scss';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './icon.html';

export default function ({ system, context, parent, config }) {
    let obj = {};
    const { name } = config;
    const { icon = context.appsManifest.find(i => i.name === name).icon } = config;
    const url = `/${system.info().lang}/${context.locale.get(`apps.${config.name}.url`)}`;
    const view = HtmlView(template, styles, { url });
    const iconClass = view.get('icon').className;
    const notifiers = ['news', 'reviews', 'press', 'promotions', 'bonusCards', 'beautyparties', 'treatments', 'photos'];

    window.rx.connect({
        orientation: () => system.deviceInfo().orientation,
        notifications: () => system.store.notifications,
        loaded: () => system.store[`app_load_${name}`]
    }, function ({ orientation, loaded }) {
        view.style(orientation);
        view.get().style.pointerEvents = loaded === 100 ? 'all' : 'none';
        view.get('loader').innerHTML = `LOADING\n${loaded}%`;
        view.get('loader').style.display = loaded === 100 ? 'none' : 'block';
        view.get('text').innerHTML = context.locale.get(`apps.${name}.iconText`);
        view.get('icon').className = iconClass + ' ' + icon;
        view.get('notify').style.display = 'none';
        notifiers
            .filter(n => n === name)
            .filter(name => {
                return name === 'reviews' || name === 'photos'
                    ? system.getStorage(name).length < system.store[name].length
                    : system.store[name].filter(i => system.getStorage(name).indexOf(i.identificador) === -1).length > 0;
            })
            .forEach(() => {
                view.get('notify').style.display = 'block';
                const innerHTML = name === 'reviews' || name === 'photos'
                    ? Math.abs(system.getStorage(name).length - system.store[name].length)
                    : system.store[name].filter(i => system.getStorage(name).indexOf(i.identificador) === -1).length;
                view.get('notify').innerHTML = innerHTML;
            });
    });

    parent.appendChild(view.get());

    return obj;

}