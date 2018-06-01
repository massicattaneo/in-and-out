function compare(a, b, position) {
    return a.split('/')[position + 2] === b.split('/')[position + 2];
}

function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

function setPageInfo(href, context, gos, system) {
    const pathname = href.substr(0, href.indexOf('?') === -1 ? href.length : href.indexOf('?'));
    const url = (!system.store.logged) ? '/admin/es/entra' : pathname;
    const urls = context.locale.get('urls');
    const goName = Object.keys(urls).filter(key => urls[key].href === url);
    const { title } = urls[goName];
    document.title = context.locale.get('documentWindowTitle', title);
    document.getElementById('main').innerHTML = '';
    document.getElementById('main').appendChild(gos[goName].get());
    gos.header.setTitle(title);
    document.getElementById('menu').removeStyle('is-visible');
    let querySelector = document.querySelector('.mdl-layout__obfuscator');
    if (querySelector)
        querySelector.removeStyle('is-visible');
    setTimeout(componentHandler.upgradeDom, 0);
    gos[goName].update && gos[goName].update(parseQuery(location.search))
}

export default async function ({ system, gos }) {
    const context = this;
    let activeUrl = '';

    /** START an APP */
    system
        .onNavigate()
        .filter(e => e.match(/\//g).length > 1 && e.substr(0, 4) !== '/api')
        .subscribe(async (event) => {
            const old = activeUrl;
            activeUrl = event;
            if (old !== event) {
                if (!compare(old, event, 0)) {
                    /** change language */
                    setPageInfo('/admin/es', context, gos, system);
                }
                if (!compare(old, event, 1)) {
                    /** change page */
                    setPageInfo(event, context, gos, system);
                }
            }
        });

    system
        .onNavigate()
        .filter(e => e === '/admin/es')
        .subscribe(() => {
            activeUrl = '/admin/es';
            setPageInfo(activeUrl, context, gos, system);

            if (system.info().lang === 'es') return;
            system.info().lang = 'es';
        });

    system
        .catch()
        .subscribe(function (errorName, { message }) {
            const errorMessage = context.locale.get(`errors.${errorName}`);
            const errorGeneric = context.locale.get(`errors.generic`);
            const msg = errorName !== 'custom' ? (typeof errorMessage === 'string' ? errorMessage : errorGeneric) : message;
            const error = document.getElementById('errors');
            error.MaterialSnackbar.showSnackbar({ message: msg });
            system.store.loading = false;
        });

    window.navigate = function (el, e) {
        const event = e || this.event;
        event.preventDefault();
        system.navigateTo(el.pathname + el.search);
        return false;
    };

}
