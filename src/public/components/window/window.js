import { Node, HtmlStyle, HtmlView } from 'gml-html';
import * as styles from './window.scss';
import template from './window.html';
import db from '../../../db.json';
// import EventEmitter from 'gml-event-emitter';

export default async function({ thread, system, context, parent, title, showCartIcon, url }) {
    const obj = {};
    const locale = await
        system.locale(`/localization/common/es.json`);
    const view = HtmlView(template, styles, locale.get());
    const barHeight = 40;
    const model = Object.assign({}, context.window).reactive();
    let app;
    let isDestroyed = false;

    parent.appendChild(view.get());

    const scrollable = view.get('scrollable');
    const onScroll = HTMLElement.prototype
        .addEventListener
        .bind(scrollable)
        .partial('scroll')
        .filter(shouldLoadContent)
        .debouncePromise()
        .subscribe(loadContent);

    const disconnect =
        ({
            deviceType: () => system.deviceInfo().deviceType,
            height: () => system.deviceInfo().height,
            cart: () => system.store.cart,
            windowHeight: () => model.height
        })
            .reactive()
            .connect(function t({ deviceType, height, cart, windowHeight }) {
                const wrapperHeight = windowHeight - 15;
                const isDesktop = deviceType === 'desktop';
                const contHeight = (isDesktop ? Number(wrapperHeight) : height) - barHeight;
                view.style(deviceType, {
                    bar: { height: barHeight },
                    container: { height: contHeight },
                    wrapper: isDesktop ? { top: model.y, left: model.x, width: model.width, height: model.height } : {}
                });
                view.get('title').innerHTML = title;
                view.get('notify').style.setProperty('display', cart.length ? 'block' : 'none', 'important');
                view.get('notify').innerHTML = cart.length;
                view.get('cart').style.display = showCartIcon ? 'block' : 'none';
            });

    obj.startApp = system.deviceInfo().deviceType === 'desktop' ? startDesktopApp : startMobileApp;

    obj.destroy = function() {
        isDestroyed = true;
        return new Promise(function(resolve) {
            obj.get().addEventListener('transitionend', function() {
                context.main.removeChild(obj.get());
                disconnect();
                view.get('scrollable').removeEventListener('scroll', onScroll);
                view.get('bar').removeEventListener('mousedown', mousedown);
                view.get('').removeEventListener('mouseup', mouseup);
                view.get('bar').removeEventListener('dblclick', doubleclick);
                app.destroy && app.destroy();
                context.focuses.splice(context.focuses.indexOf(obj), 1);
                resolve();
            });
            obj.get().style.transform = `translate(${system.deviceInfo().width}px, 0)`;
        });
    };

    obj.navigateTo = function(subpage) {
        app.navigateTo && app.navigateTo(subpage);
    };

    obj.url = url;

    function doubleclick() {
        model.x = 5;
        model.y = 5;
        model.width = system.deviceInfo().width - 30;
        model.height = system.deviceInfo().height - 30;
    }

    function shouldLoadContent() {
        const windowHeight = window.innerHeight - barHeight;
        const remaining = scrollable.scrollHeight - scrollable.scrollTop - windowHeight;
        const customGap = 240;
        return (remaining + customGap < windowHeight) && app.loadContent;
    }

    async function loadContent() {
        await app.loadContent();
        if (shouldLoadContent()) {
            await loadContent();
        }
    }

    async function startMobileApp(name) {
        const apps = await system.install(name);
        view.get().style.transform = `translate(${system.deviceInfo().width}px, 0)`;
        app = await apps[name]({ parent: view.get('content'), db, thread, context });
        await new Promise(res => setTimeout(res, 0));
        shouldLoadContent() && loadContent();
        view.get().style.transform = `translate(0, 0)`;
    }

    async function startDesktopApp(name) {
        view.get('').addEventListener('mouseup', resize);
        view.get('bar').addEventListener('mousedown', mousedown);
        view.get('bar').addEventListener('dblclick', doubleclick);
        view.get().style.left = context.window.x + 'px';
        view.get().style.top = context.window.y + 'px';
        const apps = await system.install(name);
        app = await apps[name]({ parent: view.get('content'), db, thread, context });

        shouldLoadContent() && loadContent();
    }

    function changeFocus() {
        system.navigateTo(url);
    }

    function convert(string) {
        return Number(string.replace('px', ''));
    }

    function resize(e) {
        setTimeout(function() {
            if (!isDestroyed) {
                const style = view.get().style;
                model.width = convert(style.width);
                model.height = convert(style.height);
                context.window.width = convert(style.width);
                context.window.height = convert(style.height);
            }
        }, 10);
    }

    function mousedown(e) {
        model.x = -Number(view.get().style.left.replace('px', '')) + e.clientX;
        model.y = -Number(view.get().style.top.replace('px', '')) + e.clientY;
        window.addEventListener('mousemove', mousemove);
        window.addEventListener('mouseup', mouseup);
    }

    function mousemove(e) {
        view.get().style.left = e.clientX - model.x + 'px';
        view.get().style.top = e.clientY - model.y + 'px';
    }

    function mouseup(e) {
        changeFocus();
        const style = view.get().style;
        model.x = convert(style.left);
        model.y = convert(style.top);
        context.window.x = convert(style.left);
        context.window.y = convert(style.top);
        window.removeEventListener('mousemove', mousemove);
        window.removeEventListener('mouseup', mouseup);
    }

    obj.get = view.get;

    return obj;

}