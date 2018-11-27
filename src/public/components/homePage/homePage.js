import * as styles from './homePage.scss';
import * as newsStyles from './news.scss';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import Header from '../header/header';
import Icon from '../icon/icon';
import template from './homePage.html';
import newsTemplate from './news.html';

export default async function ({ system, parent, context, thread }) {
    let obj = {};
    const view = HtmlView(template, styles, context.locale.get());
    const error = view.get('error');
    let header = view.get('header');

    await Header({ parent: header, system, context });

    context.appsManifest.forEach(config => {
        if (config.desktop) {
            Icon({ parent: view.get('icons'), system, config, context });
        }
    });

    let timer;
    system
        .catch()
        .subscribe(function (errorName, params) {
            const { message } = params;
            clearTimeout(timer);
            system.store.loading = false;
            const errorMessage = context.locale.get(`errors.${errorName}`);
            const errorGeneric = context.locale.get(`errors.generic`);
            const msg = errorName !== 'custom' ? (typeof errorMessage === 'string' ? errorMessage : errorGeneric) : message;
            error.innerHTML = msg;
            error.style.top = '10px';
            if (params === 'anonymous') {
                system.store.logged = false;
                error.innerHTML = context.locale.get(`errors.session-expired`);
                system.navigateTo('/es/cuenta/entrar');
            }
            timer = setTimeout(function () {
                error.style.top = '-90px';
            }, 3000);
        });

    parent.appendChild(view.get());

    const maxPreviewLength = 350;
    const item1 = system.store.news.map(i => {
        return {
            title: i.titulo,
            src: `/google/drive/novedades/${system.deviceInfo().deviceType}.${i.foto}`,
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/novedades/${i.href}">LEER MAS</a>`,
        };
    })[0];
    const item2 = system.store.promotions.map(i => {
        return {
            title: i.titulo, src: `/google/drive/promociones/${system.deviceInfo().deviceType}.${i.foto}`,
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/promociones/${i.href}">LEER MAS</a>`,
        };
    })[0];
    const item3 = system.store.press.map(i => {
        return {
            title: i.titulo, src: `/google/drive/en-los-medios/${system.deviceInfo().deviceType}.${i.foto}`,
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/en-los-medios/${i.href}">LEER MAS</a>`,
        };
    })[0];
    const item4 = system.store.photos.map(i => {
        return { title: 'Nuestra ultima foto', src: i.url };
    })[0];
    const items = [];

    items.push(...[item2, item1, item3, item4].map(function (item) {
        const params = Object.assign({ item }, context.locale.get());
        return view.appendTo('news', newsTemplate, newsStyles, params);
    }));

    window.rx.connect({
        height: () => system.deviceInfo().height,
        width: () => system.deviceInfo().width,
        deviceType: () => system.deviceInfo().deviceType,
        open: () => system.store.windowOpened
    }, function ({ height, width, open, deviceType }) {
        const visibleWidth = (open & deviceType !== 'desktop' && width >= 600) ? width - 600 : width;
        view.style('', {
            scrollable: { height },
            iconswrapper: { width: (open & deviceType !== 'desktop') ? width - 600 : 'auto' },
            news: { width: visibleWidth },
            image: { width: visibleWidth },
        });
        error.style.top = '-90px';
        items.forEach(function (item) {
            const number = Math.min(4, Math.floor(visibleWidth / 300));
            const howMuch = Math.max(1, number - (number % 2));
            item.style('', { wrapper: { width: (visibleWidth / howMuch) - 50 } });
        });
    });

    system.locale(`/localization/globalize/${system.info().lang}.json`);
    Array.prototype
        .forEach
        .bind(context.appsManifest)
        .queue()
        .subscribe(function ({ stage, name }) {
            system.locale(`/localization/${name}/${system.info().lang}.json`);
            return system.loadStageFiles(stage)
                .on('progress', percentage => system.store[`app_load_${name}`] = parseInt(percentage, 10))
                .on('complete', () => system.store[`app_load_${name}`] = 100)
                .start();
        });

    return obj;

}
