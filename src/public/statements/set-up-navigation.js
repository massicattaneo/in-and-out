import Window from '../components/window/window';

function compare(a, b, position) {
    return a.split('/')[position + 1] === b.split('/')[position + 1];
}

export default async function ({ system, wait, thread }) {
    const context = this;
    let activeUrl = '';

    context.window = {
        x: 50,
        y: 100,
        height: system.deviceInfo().height - 200,
        width: Math.min(system.deviceInfo().width - 200, 600)
    };

    context.focuses = [];
    context.focusIndex = 0;


    async function createWindow(name, appBaseUrl) {
        let title = context.locale.get(`apps.${name}.windowTitle`);
        const filter = context.appsManifest.filter(i => i.name == name);
        const showCartIcon = filter.length ? filter[0].showCartIcon : false;
        context.focuses.push(await Window({
            thread,
            system,
            context,
            parent: context.main,
            title,
            showCartIcon,
            url: appBaseUrl
        }));
        context.focusIndex = context.focuses.length - 1;
        await context.focuses[context.focusIndex].startApp(name);
    }

    /** START an APP */
    system
        .onNavigate()
        .filter(e => e.match(/\//g).length > 1 && e.substr(0, 4) !== '/api')
        .subscribe(async(event) => {
            const old = activeUrl;
            activeUrl = event;
            if (old !== event) {
                if (!compare(old, event, 0)) {
                    /** change language */
                }
                const appBaseUrl = event.split('/').splice(0, 3).join('/');
                if (!compare(old, event, 1)) {
                    if (context.focuses.filter(w => w.url === appBaseUrl).length) {
                        context.focusIndex = context.focuses.indexOf(context.focuses.find(w => w.url === appBaseUrl));
                        context.focuses[context.focusIndex].navigateTo();
                    } else {
                        if (context.focuses.length) {
                            if (system.deviceInfo().deviceType === 'desktop') {
                                context.window.x += 40;
                                context.window.y += 40;
                            } else {
                                await context.focuses[context.focusIndex].destroy();
                            }
                        }
                        /** change window */
                        const res = event.split('/')[2];
                        const aps = context.locale.get('apps');
                        const name = Object.keys(aps).filter(k => aps[k].url === res)[0];
                        if (res && name) {
                            await createWindow(name, appBaseUrl);
                        } else if (event === '/es/contacto/') {
                            await createWindow('callUs', appBaseUrl);
                        } else if (event === '/es/novedades/') {
                            await createWindow('news', appBaseUrl);
                        } else if (event === '/es/tratamientos-de-belleza/') {
                            await createWindow('treatments', appBaseUrl);
                        } else if (event === '/es/beauty-parties/') {
                            await createWindow('beautyparties', appBaseUrl);
                        } else if (event === '/es/in-out-go/') {
                            await createWindow('inandoutgo', appBaseUrl);
                        } else if (event === '/es/beauty-corner/') {
                            await createWindow('beautycorner', appBaseUrl);
                        } else if (event === '/es/inout-los-medios/') {
                            await createWindow('press', appBaseUrl);
                        } else if (event === '/es/inout-los-medios/') {
                            await createWindow('beautycorner', appBaseUrl);
                        } else if (event === '/es/quienes-somos/') {
                            await createWindow('team', appBaseUrl);
                        } else if (event === '/es/seccion/promociones/') {
                            await createWindow('promotions', appBaseUrl);
                        } else if (event === '/es/seccion/depilacion-con-hilo/') {
                            await createWindow('treatments', appBaseUrl);
                        } else if (res === 'tag') {
                            await createWindow('search', appBaseUrl);
                        } else if (res) {
                            await createWindow('blog', appBaseUrl);
                        }
                    }
                    if (context.focuses.filter(w => w.url === appBaseUrl).length) {
                        context.focuses.forEach(w => {
                            w.get().style.zIndex = w.url === appBaseUrl ? 21 : 20;
                        });
                    }

                }
                if (!compare(old, event, 2)) {
                    const focus = context.focuses.find(w => w.url === appBaseUrl);
                    focus && focus.navigateTo(event.split('/')[3]);
                }
                system.store.windowOpened = true;
            }
        });

    system
        .onNavigate()
        .filter(e => e === '/es')
        .subscribe(() => {
            const url = context.redirectUrl;
            if (!(url === '' || url === '/es' || url === '/' || url.startsWith('/api') || url.startsWith('/es/'))) {
                context.redirectUrl = '/es' + url;
            }
            activeUrl = '/es';
            if (context.focuses.length) {
                context.focuses[context.focusIndex].destroy();
                context.window.x = Math.max(100, context.window.x - 40);
                context.window.y = Math.max(100, context.window.y - 40);
            }
            system.store.windowOpened = false;
            if (system.info().lang === 'es') return;
            system.info().lang = 'es';
            return system.locale(`/localization/system/es.json`).then(async function (locale) {
                await locale.load(`/localization/static.json`);
                context.locale = locale;
            });
        });

    system
        .onNavigate()
        .filter(e => e === '/api/login/confirm')
        .subscribe(async() => {
            const url = system.info().lang === 'es' ? '/es/entra' : '/en/login';
            activeUrl = url;
            system.navigateTo(url);
        });

    window.navigate = function (el, e) {
        const event = e || this.event;
        event.preventDefault();
        system.navigateTo(el.pathname);
        return false;
    };

    system
        .onNavigate()
        .subscribe(url => {
            if (this.lastUrlVisited !== url) {
                ga('send', 'pageview', url);
            }
            this.lastUrlVisited = url;
        });

}
