import Window from '../components/window/window';

function compare(a, b, position) {
    return a.split('/')[position + 1] === b.split('/')[position + 1];
}

export default async function({ system, wait, thread }) {
    const context = this;
    let activeUrl = '';

    context.window = {
        x: 100,
        y: 100,
        height: system.deviceInfo().height - 200,
        width: Math.min(system.deviceInfo().width - 200, 600)
    };

    context.focuses = [];
    context.focusIndex = 0;

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
                const appBaseUrl = event.split('/').splice(0,3).join('/');
                if (!compare(old, event, 1)) {
                    if (context.focuses.filter(w => w.url === appBaseUrl).length) {
                        context.focuses.forEach(w => {
                            w.get().style.zIndex = w.url === appBaseUrl ? 2 : 1;
                        });
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
                        let title = context.locale.get(`apps.${name}.windowTitle`);
                        document.title = context.locale.get('documentWindowTitle', title);
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

                }
                if (!compare(old, event, 2)) {
                    const focus = context.focuses.find(w => w.url === appBaseUrl);
                    focus.navigateTo(event.split('/')[3]);
                }
                system.store.windowOpened = true;
            }
        });

    system
        .onNavigate()
        .filter(e => e === '/es')
        .subscribe(() => {
            activeUrl = '/es';
            if (context.focuses.length) {
                context.focuses[context.focusIndex].destroy();
                context.window.x = Math.max(100, context.window.x - 40);
                context.window.y = Math.max(100, context.window.y - 40);
            }
            if (context.locale) {
                document.title = context.locale.get('documentTitle');
            }
            system.store.windowOpened = false;
            if (system.info().lang === 'es') return;
            system.info().lang = 'es';
            return system.locale(`/localization/system/es.json`).then(function(locale) {
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

    window.navigate = function(el) {
        this.event.preventDefault();
        system.navigateTo(el.pathname);
    };

    system
        .onNavigate()
        .subscribe(url => {
            if (this.lastUrlVisited !== url) {
                ga('send', 'pageview');
            }
            this.lastUrlVisited = url;
        })

}
