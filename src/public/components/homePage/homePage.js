import * as styles from './homePage.scss';
import * as newsStyles from './news.scss';
import { HtmlView } from 'gml-html';
import Header from '../header/header';
import Icon from '../icon/icon';
import template from './homePage.html';
import newsTemplate from './news.html';
import sliderTemplate from './sliderItem.html';
import treatmentTemplate from './treatmentItem.html';
import { tns } from 'tiny-slider/src/tiny-slider';
import { getCartTotal, isInPromotion } from '../../../../web-app-deploy/shared';

function getTreatments(i) {
    return (i.tratamientos || '').split('|').map(string => string.split('x')[1]);
}

export default async function ({ system, parent, context, thread }) {
    let obj = {};
    const view = HtmlView(template, styles, context.locale.get());
    const error = view.get('error');
    let header = view.get('header');

    await Header({ parent: header, system, context });

    view.get('slider').style.opacity = 0;
    view.get('treatments').style.opacity = 0;

    view.get('treatments').buy = id => {
        system.store.cart.push(id);
        system.navigateTo('/es/cesta');
    };

    system.store.products
        .filter(product => product.posicion === 1 || isInPromotion(system.store.promotions, product))
        .sort((first, second) => {
            if (isInPromotion(system.store.promotions, first)) return -1;
            if (isInPromotion(system.store.promotions, second)) return 1;
            return 0;
        })
        .forEach(product => {
            const cartTotal = getCartTotal(system.store, [product.identificador]);
            const discount = Math.round(cartTotal.discount / product.precio * 100);
            view.appendTo('slider', sliderTemplate, [], Object.assign({
                isPromotion: isInPromotion(system.store.promotions, product)
                    ? `<div style="padding: 5px 5px 0 5px">DESCUENTO ${discount.toFixed(2)}%</div>`
                    :''
            }, product, context.locale.get()));
        });

    const treatments = system.store.treatments
        .filter(trt => trt.foto);

    treatments
        .forEach(trt => {
            view.appendTo('treatments', treatmentTemplate, [], Object.assign({}, trt, context.locale.get()));
        });

    setTimeout(function () {
        const slider = tns({
            'container': '.home-product-slider',
            'autoWidth': true,
            'gutter': 20,
            'mouseDrag': true,
            autoplay: true,
            nav: false,
            arrowKeys: false,
            autoplayTimeout: 4000,
            slideBy: 2,
            edgePadding: 200
        });
        view.get('slider').style.opacity = 1;
    }, 500);
    setTimeout(function () {
        const slider = tns({
            'container': '.home-treatments-slider',
            'autoWidth': true,
            'gutter': 20,
            'mouseDrag': true,
            autoplay: true,
            nav: false,
            arrowKeys: false,
            autoplayTimeout: 4000,
            slideBy: 1,
            edgePadding: 200
        });
        view.get('treatments').style.opacity = 1;
    }, 1500);

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
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/novedades/${i.href}">LEER MAS</a>`
        };
    })[0];
    const item2 = system.store.promotions.map(i => {
        return {
            title: i.titulo, src: `/google/drive/promociones/${system.deviceInfo().deviceType}.${i.foto}`,
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/promociones/${i.href}">LEER MAS</a>`
        };
    })[0];
    const item3 = system.store.press.map(i => {
        return {
            title: i.titulo, src: `/google/drive/en-los-medios/${system.deviceInfo().deviceType}.${i.foto}`,
            info: i.descripcion.substr(0, maxPreviewLength) + `... <br/><a onclick="window.navigate(this, event)" href="/es/en-los-medios/${i.href}">LEER MAS</a>`
        };
    })[0];
    const item4 = system.store.photos.map(i => {
        return { title: 'Nuestra ultima foto', src: i.url };
    })[0];
    const items = [];

    const blocks = item2 ? [item2, item1, item3, item4] : [item1, item3, item4];
    items.push(...blocks.map(function (item) {
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
            image: { width: visibleWidth }
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
