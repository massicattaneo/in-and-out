import * as styles from './header.scss';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './header.html';

export default async function ({ system, context, parent }) {
    const obj = {};
    const locale = await system.locale(`/localization/common/es.json`);
    const loginUrl = `/${system.info().lang}/${context.locale.get(`apps.login.url`)}`;
    const cartUrl = `/${system.info().lang}/${context.locale.get(`apps.cart.url`)}`;
    const view = HtmlView(template, styles, { loginUrl, cartUrl });

    window.rx.connect({
        deviceType: () => system.deviceInfo().deviceType,
        orientation: () => system.deviceInfo().orientation,
        logged: () => system.store.logged,
        cart: () => system.store.cart
    }, function ({ orientation, logged }) {
        view.style(orientation);
        view.get('user').style.setProperty('color', logged ? '#56ab2a' : '', 'important');
        view.get('notify').style.setProperty('display', system.store.cart.length ? 'block' : 'none', 'important');
        view.get('notify').innerHTML = system.store.cart.length;
        view.get('logo').style.backgroundImage = `url(/assets/images/manzana.svg?v=${locale.get('system.version')})`;
    });

    parent.appendChild(view.get());
    return obj;

}