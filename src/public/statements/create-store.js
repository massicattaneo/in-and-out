function sortByDate(field) {
    return function (a,b) {
        return (new Date(b[field].split('/').reverse().join('-'))).getTime() -
            (new Date(a[field].split('/').reverse().join('-'))).getTime();
    }
}
function addDescription(i) {
    return Object.assign(i, {descripcion: i.descripcion || ''});
}
export default async function ({ system, wait, thread }) {
    let status = await getStatus();
    const context = this;
    const reqPhotos = RetryRequest('/api/public-db', { headers: { 'Content-Type': 'application/json' } });
    const publicDb = JSON.parse((await reqPhotos.get()).responseText);
    const deviceType = system.deviceInfo().deviceType === 'unknown' ?
        'desktop' : system.deviceInfo().deviceType;

    publicDb.press = (publicDb.press || []).map(addDescription);


    const staticStore = {
        logged: status.logged,
        email: status.email,
        bookings: status.bookings || [],
        photos: publicDb.photos ? publicDb.photos
            .filter(p => p.folder === 'fotos')
            .filter(p => p.url.indexOf(`${deviceType}.`) !== -1)
            .sort((a,b) => b.name.localeCompare(a.name))
            : [],
        allPhotos: publicDb.photos || [],
        cart: system.getStorage('cart') || [],
        treatments: publicDb.treatments || [],
        promotions: publicDb.promotions ? publicDb.promotions.sort(sortByDate('creacion')) : [],
        news: publicDb.news ? publicDb.news.sort(sortByDate('fecha')) : [],
        press: publicDb.press ? publicDb.press.sort(sortByDate('fecha')) : [],
        products: publicDb.products || [],
        bonusCards: publicDb.bonusCards ?
            publicDb.bonusCards
                .filter(function(i) {
                    const date = Date.now();
                    const from = (new Date(i.desde.split('/').reverse().join('-')));
                    const to = (new Date(i.hasta.split('/').reverse().join('-')));
                    from.setHours(0,0,0,0);
                    to.setHours(23,59,59,59);
                    return date >= from.getTime() && date <= to.getTime()
                })
                .sort(sortByDate('desde'))
            : [],
        beautyparties: publicDb.beautyparties || [],
        centers: publicDb.centers,
        calendars: publicDb.calendars,
        notifications: Math.random(),
        reviews: new Array(publicDb.reviews.count).fill(''),
        reviewsAverage: publicDb.reviews.average,
        windowOpened: false,
        loading: false
    };
    context.appsManifest
        .reduce((s, { name }) => {
            const source = {};
            source[`app_load_${name}`] = 0;
            return Object.assign(s, source);
        }, staticStore);
    system.store = (staticStore).reactive();


    system.initStorage({
        news: system.store.news.map(i => i.identificador),
        press: system.store.press.map(i => i.identificador),
        promotions: system.store.promotions.map(i => i.identificador),
        bonusCards: system.store.bonusCards.map(i => i.identificador),
        treatments: system.store.treatments.map(i => i.identificador),
        beautyparties: system.store.beautyparties.map(i => i.identificador),
        reviews: system.store.reviews,
        photos: system.store.photos.map(i => i.url)
    });

    function updateFavourites(favourites) {
        if (system.store.logged) {
            favourites.forEach(function (id) {
                system.store.treatments.filter(i => i.identificador == id).forEach(i => i.favourite = true)
            });
        }
    }

    async function getStatus() {
        const reqStatus = RetryRequest('/api/login/status');
        try {
            return JSON.parse((await reqStatus.get()).responseText);
        } catch (e) {
            return status = {
                logged: false,
                email: '',
                favourites: []
            }
        }
    }

    ({ cart: () => system.store.cart })
        .reactive()
        .connect(function ({ cart }) {
            system.setStorage({ cart: cart })
        });

    updateFavourites(status.favourites);

    ({ logged: () => system.store.logged })
        .reactive()
        .connect(async function () {
            const { bookings = [], favourites, email } = await getStatus();
            system.store.bookings.splice(0, system.store.bookings.length);
            system.store.bookings.push(...bookings);
            system.store.treatments.forEach(i => i.favourite = false);
            system.store.email = email;
            updateFavourites(favourites);
            const old = system.store.treatments.splice(0, system.store.treatments.length);
            system.store.treatments.push(...old);
        });

    system.addFileManifest(system.store.photos.map(function ({ url }) {
        return { type: 'image', stage: url, url, size: 1 }
    }));
}