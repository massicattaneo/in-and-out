const google = require('googleapis');
const calendar = google.calendar('v3');
const drive = google.drive('v2');
const googleSheets = google.sheets('v4');
const fs = require('fs');
const googleDb = require('./private/new-hours.js');
const jwtClient = new google.auth.JWT(
    googleDb.client_email,
    null,
    googleDb.private_key,
    [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/content',
        'https://www.googleapis.com/auth/drive'
    ]
);
const sharp = require('sharp');
google.options({ auth: jwtClient });
const processes = require('./processes.json');
const sm = require('sitemap');
const appsManifest = require('./static/localization/system/es.json');
const shared = require('./shared');
const striptags = require('striptags');

function deleteFolder(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            const curPath = path + '/' + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolder(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function formatGoogleSheet({ value, format }) {
    function formatted(string, format) {
        const style = Object.keys(format).map(key => {
            switch (key) {
            case 'bold':
                return `font-weight: ${format[key] ? 'bold' : 'normal'}`;
            case 'fontSize':
                return `font-size: ${format[key]}px`;
            default:
                return '';
            }
        }).join(';');
        return `<span style="${style}">${string}</span>`;
    }

    let str = '';
    format.forEach(function (item, i, a) {
        const startIndex = item.startIndex || 0;
        const nextIndex = a[i + 1] ? a[i + 1].startIndex : value.length;
        str += formatted(value.substr(startIndex, nextIndex - startIndex), item.format);
    });

    return str.replace(/\n/g, '<br/>');
}

function parseHref(item) {
    return item.toLowerCase().trim()
        .replace(/&/g, ' and ')
        .replace(/[`~!¡@#$%^&*()´_|+=?¿;:'",<>\{\}\[\]\\\/]/gi, '')
        .replace(/à/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ë/g, 'e')
        .replace(/ï/g, 'i')
        .replace(/í/g, 'i')
        .replace(/ì/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ò/g, 'o')
        .replace(/ó/g, 'o')
        .replace(/ó/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ù/g, 'u')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace('&', ' and ')
        .replace(/\s\s+/g, ' ')
        .trim()
        .replace(/\s/g, '-');
}

function parseSheet(sht) {
    const cols = sht[0].filter(i => i.formattedValue).map(i => i.formattedValue.replace(/\s/g, '_'));
    return sht.slice(1)
        .filter(sh => sh && sh[0] && sh[0].formattedValue !== undefined)
        .map(function (sh) {
            return cols.map((name, index) => {
                if (!sh[index]) return { value: '' };
                if (sh[index].textFormatRuns)
                    return formatGoogleSheet({ value: sh[index].formattedValue, format: sh[index].textFormatRuns });
                return sh[index].formattedValue;
            }).reduce((ret, item, index) => {
                const col = cols[index];
                if (!item) {
                    ret[col] = '';
                    return ret;
                }
                if (col === 'titulo') {
                    ret['href'] = parseHref(item);
                }
                if (col === 'marca' || col === 'tipo') {
                    ret['menuhref'] = parseHref(item);
                }
                ret[col] = item;
                return ret;
            }, {});
        });
}

function getLastmodISO(string) {
    return new Date(string.split('/').reverse().join('-')).toISOString();
}

module.exports = function (utils, posts) {
    const obj = {};
    const calendars = {};

    obj.authorize = function () {
        return new Promise(function (resolve, reject) {
            jwtClient.authorize(function (err, token) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(token);
            });
        });
    };

    obj.initCalendar = function () {
        return new Promise(function (res, rej) {
            calendar.calendarList
                .list(function (err, resp) {
                    resp.items.forEach(function (c) {
                        calendars[c.id] = c;
                    });
                    res(calendars);
                });
        });
    };

    const photos = [];
    const sheets = {};
    const root = '/google/drive/';

    function savePhoto(fold, item, imageWidth, deviceType) {
        return new Promise(function (resolve, reject) {
            const url = `${root}${fold.name}/${deviceType}.${parseHref(item.title)}`;
            const format = item.mimeType.replace('image/', '');
            const existsSync = fs.existsSync(__dirname + url);
            if (existsSync) {
                return resolve({
                    url,
                    name: item.title,
                    folder: fold.name
                });
            }
            const dest = fs.createWriteStream(__dirname + url);

            const resizer = sharp().resize(imageWidth,
                parseInt((imageWidth / item.imageMediaMetadata.width) * item.imageMediaMetadata.height, 10))
                .rotate()[format]();
            drive.files.get({ fileId: item.id, alt: 'media' })
                .on('end', function () {
                    resolve({
                        url,
                        name: item.title,
                        folder: fold.name
                    });
                })
                .pipe(resizer)
                .pipe(dest)
                .on('error', reject);
        });
    }

    obj.initDrivePhotos = function () {
        const promises = [];
        return new Promise(function (res, rej) {
            // deleteFolder(`${__dirname}/google/drive`);
            if (!fs.existsSync(`${__dirname}/google/drive`)) {
                fs.mkdirSync(`${__dirname}/google/drive`);
            }

            drive.files.list({}, async function (err, list) {
                if (list.nextPageToken) {
                    await new Promise(function (resolve) {
                        drive.files.list({
                            pageToken: list.nextPageToken
                        }, (err, l) => {
                            list.items.push(...l.items);
                            resolve();
                        });
                    });
                }

                const folders = list.items
                    .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
                    .filter(item => item.title !== 'website')
                    .map(item => {
                        if (!fs.existsSync(`${__dirname}/google/drive/${item.title}`)) {
                            fs.mkdirSync(`${__dirname}/google/drive/${item.title}`);
                        }
                        return {
                            id: item.id,
                            name: item.title
                        };
                    });
                promises.push(...list.items
                    .filter(item => item.mimeType === 'image/jpeg')
                    .map(function (item, index) {
                        const fold = folders.filter(f => f.id === item.parents[0].id)[0];
                        if (fold) {
                            return async function () {
                                photos.push(await savePhoto(fold, item, 320, 'mobile'));
                                photos.push(await savePhoto(fold, item, 768, 'tablet'));
                                photos.push(await savePhoto(fold, item, 1024, 'desktop'));
                            };
                        }
                        return function () {
                            return Promise.resolve();
                        };
                    }));

                (function queue(index) {
                    if (promises[index]) {
                        promises[index]()
                            .then(function () {
                                queue(index + 1);
                            })
                            .catch(function () {
                                queue(index + 1);
                            });
                    } else {
                        res();
                    }
                })(0);

            });

        });
    };

    obj.publicDb = function () {
        const ret = { photos };
        Object.assign(ret, sheets, {
            calendars: googleDb.calendars,
            centers: googleDb.centers,
            workers: googleDb.workers,
            timestamp: new Date().toISOString(),
            processes,
            settings: {
                freeChargeLimit: 60,
                sendingCharge: 4.99,
            }
        });
        return ret;
    };

    obj.initDriveSheets = function () {
        return Promise.all([
            getTreatmentsList(),
            getBeautypartiesList(),
            getPromotionsList(),
            getNewsList(),
            getProductsList(),
            getPressList(),
            getBonusCardsList()
        ]).then(function (array) {
            const modified = array.map(parseSheet);
            sheets.treatments = modified[0] || [];
            sheets.beautyparties = modified[1] || [];
            sheets.promotions = modified[2] || [];
            sheets.news = modified[3] || [];
            sheets.products = (modified[4] || []).map(p => Object.assign(p, { titulo: `${p.marca}: ${p.titulo}` }));
            sheets.press = modified[5] || [];
            sheets.bonusCards = modified[6] || [];
        });
    };

    obj.freeBusy = function ({ timeMin, timeMax, items }) {
        return new Promise(function (res, rej) {
            const temp = {
                headers: { 'content-type': 'application/json' },
                resource: { timeMin, timeMax, items }
            };
            calendar.freebusy.query(temp, function (err, data) {
                if (err) return rej(new Error('error'));
                if (!data) return rej(new Error('error'));
                const array = Object.keys(data.calendars).map(googleId => {
                    return {
                        workerIndex: googleDb.workers.find(w => w.googleId === googleId).index,
                        busy: data.calendars[googleId].busy
                    };
                }).reduce((ret, item) => {
                    ret[item.workerIndex] = item.busy;
                    return ret;
                }, new Array(googleDb.workers.length));
                return res(array);
            });
        });
    };

    obj.getTreatmentsDuration = function (treatments, calendarIndex, locationIndex, timestamp) {
        // console.log('************ CALENDAR', calendarIndex, locationIndex);
        const number = treatments
            .map(id => {
                const treat = sheets.treatments.filter(t => t.identificador == id)[0];
                const cal = googleDb.calendars[calendarIndex];
                // console.log('LOCATION INDEX', cal.lo-cationIndex);
                if (locationIndex != cal.locationIndex) return -2000000000000;
                const date = new Date(timestamp);
                const periods = cal.week[date.getDay()].periods;
                const isWorkingDay = periods.filter(period => {
                    const from = new Date(timestamp);
                    from.setUTCHours(...decimalToTime(period[0]));
                    const to = new Date(timestamp);
                    to.setUTCHours(...decimalToTime(period[1]));
                    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
                });
                // console.log('IS WORKING DAY', isWorkingDay);
                if (isWorkingDay.length === 0) return -2000000000000;
                // console.log('ONE TREATMENT', treat[cal.worker]);
                if (parseInt(treat[cal.worker], 10) === 0) return -2000000000000;
                return parseInt(treat[cal.worker], 10);
            })
            .reduce((a, b) => a + b, 0);
        return (Math.ceil(number / 15) * 15) * 60 * 1000;
    };

    obj.getTreatmentsLabel = function (treatments) {
        return treatments
            .map(id => {
                const treat = sheets.treatments.filter(t => t.identificador === id)[0];
                return `${treat.tipo}: ${treat.titulo}`;
            })
            .join(' - ');
    };

    obj.calendarInsert = function ({ id, from, to, label, description = '', summary, processId = 97 }) {
        return new Promise(function (resolve, reject) {
            const location = shared.getLocation(googleDb, from, id).address;
            const params = {
                calendarId: id,
                resource: {
                    summary,
                    location,
                    start: { 'dateTime': (new Date(from)).toISOString() },
                    end: { 'dateTime': (new Date(to)).toISOString() },
                    description,
                    extendedProperties: { private: { processId, label } }
                }
            };
            calendar.events.insert(params, function (e, o) {
                if (e) return reject(new Error('error'));
                const start = new Date(o.start.dateTime);
                const end = new Date(o.end.dateTime);
                const evt = {
                    eventId: o.id,
                    id: o.id,
                    calendarId: id,
                    summary: o.summary,
                    location: o.location,
                    date: start.toISOString(),
                    start: start.toISOString(),
                    end: end.toISOString(),
                    duration: (end.getTime() - start.getTime()) / (60 * 1000),
                    description,
                    label,
                    processId
                };
                utils.wss.broadcast(JSON.stringify({ type: 'insertEvent', data: evt }));
                resolve(evt);
            });
        });
    };

    obj.calendarDelete = function ({ eventId, calendarId }) {
        return new Promise(function (resolve, reject) {
            calendar.events.delete({ eventId, calendarId }, function (e, o) {
                utils.wss.broadcast(JSON.stringify({ type: 'deleteEvent', data: { calendarId, eventId } }));
                resolve();
            });
        });
    };

    obj.calendarGet = function (calendarId, date) {
        date.setHours(0, 0, 0, 0);
        const timeMin = date.toISOString();
        date.setHours(23, 59, 59, 999);
        const timeMax = date.toISOString();
        const params = {
            calendarId,
            timeMin: timeMin,
            timeMax: timeMax,
            timeZone: 'Europe/Madrid'
        };
        return new Promise(function (resolve, reject) {
            calendar.events.list(params, function (e, d) {
                if (e) return reject(new Error('error'));
                resolve(d);

            });
        });
    };

    obj.getBookings = async function (hash) {
        const results = await Promise.all(googleDb.workers.map(({ googleId: id }) => {
            return new Promise(function (resolve, reject) {
                const calendarId = id;
                calendar.events.list({
                    calendarId,
                    timeMin: (new Date()).toISOString(),
                    q: hash
                }, function (err, o) {
                    if (err) return reject(new Error('error'));
                    resolve(o.items.map(({ id, summary, extendedProperties, location, start, end }) => {
                        return {
                            eventId: id,
                            calendarId,
                            summary: summary, location,
                            start: new Date(start.dateTime).getTime(),
                            end: new Date(end.dateTime).getTime()
                        };
                    }));
                });
            });
        }));
        return results.reduce((a, b) => a.concat(b), []);
    };

    obj.createSitemap = function () {
        const urls = Object.keys(appsManifest.apps)
            .map(key => {
                const images = photos
                    .filter(p => p.folder === appsManifest.apps[key].url)
                    .filter(p => p.url.indexOf('desktop') !== -1);
                const img = images.map(i => {
                    return {
                        url: `https://www.inandoutbelleza.es${i.url}`,
                        title: i.name,
                        geoLocation: 'Málaga, España'
                    };
                });
                return {
                    url: `/es/${appsManifest.apps[key].url}`,
                    changefreq: 'monthly',
                    priority: 1,
                    lastmodISO: getLastmodISO(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-02`),
                    img
                };
            });

        urls.push(...sheets.promotions.map(item => {
            return {
                url: `/es/promociones/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(item.creacion)
            };
        }));
        urls.push(...sheets.treatments.map(item => {
            return {
                url: `/es/tratamientos/${item.tipo.toLowerCase().replace(/\s/g, '-').replace(/ó/g, 'o')}/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-02`)
            };
        }));
        urls.push(...sheets.bonusCards.map(item => {
            return {
                url: `/es/tarjetas/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-02`)
            };
        }));
        urls.push(...sheets.beautyparties.map(item => {
            return {
                url: `/es/beauty-parties/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-02`)
            };
        }));
        urls.push(...sheets.news.map(item => {
            return {
                url: `/es/novedades/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(item.fecha)
            };
        }));
        urls.push(...sheets.press.map(item => {
            return {
                url: `/es/en-los-medios/${item.href}`,
                changefreq: 'monthly',
                priority: 1,
                lastmodISO: getLastmodISO(item.fecha)
            };
        }));
        urls.push(...obj.getSuggestions().map(item => {
            return {
                url: `/es/buscar/${item}`,
                changefreq: 'monthly',
                priority: 0.1
            };
        }));

        const priorityPosts = ['microblading-en-malaga', 'ventajas-microblading',
            'depilacion-al-caramelo-malaga', 'depilacion-con-hilo',
            'el-exito-de-inout-tiene-nombre-depilacion-con-hilo', 'la-depilacion-con-hilo-es-la-reina',
            '3-ventajas-de-la-depilacion-con-hilo', 'los-5-esmaltes-de-opi-mas-vendidos',
            'tarjetas-regalo-tratamientos-esteticos-malaga',
            'quieres-hacer-una-beauty-party-en-malaga', 'alisado-cejas-malaga',
            'comprar-biologique-recherche-malaga', 'cosmeticos-faciales-biologique-recherche',
            'segunda-piel-biologique-recherche', 'las-famosas-usan-p50-biologique-recherche'];

        posts
            .filter(p => p.post_type === 'post')
            .forEach(function (post) {
                const images = posts
                    .filter(p => p.post_parent === post.ID)
                    .filter(p => p.post_type === 'attachment');
                const isPriority = priorityPosts.indexOf(post.post_name) !== -1;
                urls.push({
                    url: `/${post.post_name}`,
                    priority: isPriority ? 1 : 0.8,
                    lastmodISO: getLastmodISO(isPriority ? '2018-05-02 18:09:48' : post.post_date),
                    img: images.map(i => {
                        return {
                            url: `https://www.inandoutbelleza.es${i.guid}`,
                            title: i.post_title,
                            geoLocation: 'Málaga, España'
                        };
                    })
                });
            });
        return sm.createSitemap({
            hostname: 'https://www.inandoutbelleza.es/',
            cacheTime: 600000,
            urls
        });
    };

    obj.stubData = function () {
        sheets.treatments = [{
            identificador: 'TRT-1',
            titulo: 'tratamiento',
            precio: 30,
            precio_texto: '30,00 €',
            foto: '/assets/images/prd-bb_cream.jpeg',
            tipo: 'facial',
            descripcion: 'tratamiento de la piel',
            online: 'si'
        }];
        sheets.beautyparties = [];
        sheets.promotions = [];
        sheets.news = [];
        sheets.products = [{
            identificador: 'PRD-1',
            titulo: 'producto numero 1',
            disponible: 'si',
            cantidad: '50ml',
            precio: 30,
            precio_texto: '30,00 €',
            foto: '/assets/images/prd-bb_cream.jpeg',
            descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et\\r\\ndolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut\\r\\naliquip ex ea commodo consequat.'
        }];
        sheets.press = [];
        sheets.bonusCards = [];
    };

    obj.getSuggestions = function () {
        return sheets.treatments.reduce((ret, i) => ret.concat(i.titulo.split(' ')), [])
            .concat(sheets.treatments.reduce((ret, i) => ret.concat(i.tipo.split(' ')), []))
            .concat(sheets.bonusCards.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.news.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.press.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.beautyparties.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.promotions.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.products.reduce((ret, i) => ret.concat(i.titulo.split(' ')), []))
            .concat(sheets.products.reduce((ret, i) => ret.concat(i.marca.split(' ')), []))
            .concat(posts.filter(i => i.post_type === 'post').reduce((ret, i) => ret.concat(i.post_title.split(' ')), []))
            .concat(['salitre'])
            .map(i => parseHref(i))
            .filter((i, index, a) => a.indexOf(i) === index)
            .filter(i => i.length >= 4)
            .sort();
    };

    obj.getSearchResult = function (search) {
        function contains(string) {
            return words.filter(i => string.indexOf(i) !== -1).length === words.length;
        }

        const words = search.map(i => parseHref(i));
        return []
            .concat(sheets.treatments
                .filter(i => contains(parseHref(i.titulo)) || contains(parseHref(i.tipo)))
                .map(i => {
                    return {
                        type: 'treatments',
                        title: `${i.tipo} - ${i.titulo}`,
                        description: i.descripcion,
                        href: `/es/tratamientos/${parseHref(i.tipo)}/${i.href}`
                    };
                }))
            .concat(sheets.bonusCards
                .filter(i => contains(parseHref(i.titulo))).map(i => {
                    return {
                        type: 'bonusCards',
                        title: i.titulo,
                        description: i.descripcion,
                        href: `/es/tarjetas/${i.href}`
                    };
                }))
            .concat(sheets.products
                .filter(i => contains(parseHref(i.titulo)) || contains(parseHref(i.marca)))
                .map(i => {
                    return {
                        type: 'products',
                        title: `${i.titulo}`,
                        description: i.descripcion,
                        href: `/es/productos/${parseHref(i.marca)}/${i.href}`
                    };
                }))
            .concat(sheets.news.filter(i => contains(parseHref(i.titulo))).map(i => {
                return {
                    type: 'news',
                    title: i.titulo,
                    description: i.descripcion,
                    href: `/es/novedades/${i.href}`
                };
            }))
            .concat(sheets.beautyparties.filter(i => contains(parseHref(i.titulo))).map(i => {
                return {
                    type: 'beautyparties',
                    title: i.titulo,
                    description: i.descripcion,
                    href: `/es/beauty-parties/${i.href}`
                };
            }))
            .concat(sheets.promotions.filter(i => contains(parseHref(i.titulo))).map(i => {
                return {
                    type: 'promotions',
                    title: i.titulo,
                    description: i.descripcion,
                    href: `/es/promociones/${i.href}`
                };
            }))
            .concat(sheets.press.filter(i => contains(parseHref(i.titulo))).map(i => {
                return {
                    type: 'press',
                    title: i.titulo,
                    description: i.descripcion,
                    href: `/es/en-los-medios/${i.href}`
                };
            }))
            .concat(posts
                .filter(i => i.post_type === 'post')
                .filter(i => contains(parseHref(i.post_title)))
                .map(i => {
                    return {
                        type: 'blog',
                        title: i.post_title,
                        description: i.post_content,
                        href: `/es/contenido-extra/${i.post_name}`
                    };
                })
            ).map(i => Object.assign(i, { description: i.description ? striptags(i.description.substr(0, 140)) : '' }));
    };

    function getTreatmentsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1NIIZ5g2OqNfpdv6beE-UZjW_zhlA3oh8aJN7qxDBPdg',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getPressList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1zExgpnjEnLTidf5QP5L31N40HVZLb9GZ0beZwJ3WA08',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getBonusCardsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1LKMnAzNAzfLP_Tf08qUgGNGCJDDAnRpPu_Tf0CNCClM',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getBeautypartiesList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '182HSdFnWDja0Z90DN4bqx4MUPOiwgUvUZhaMtnSMCiI',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getNewsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1_0kYzYDf8nV8ZPAXH83oLF8-17pONQNIKJdTDqiTjhU',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getProductsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '19ubPdBJ0QxhpCSnQZBUfuu1ePsLeONdrCz3B0ZZizuk',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function getPromotionsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1s7l11qEZN-HvXbQCou7wbmzUsNL_y0Hg2WIbQpoiqyY',
                includeGridData: true
            }, function (err, sht) {
                if (err) return reject(new Error('error'));
                if (!sht) return reject(new Error('error'));
                res(sht.sheets[0].data[0].rowData.map(i => i.values));
            });
        });
    }

    function decimalToTime(decimalTimeString) {
        const n = new Date(0, 0);
        n.setSeconds(+decimalTimeString * 60 * 60);
        const numbers = n.toTimeString().slice(0, 8).split(':').concat([0]).map(e => parseInt(e, 10));
        numbers[0] = numbers[0] - 2;
        return numbers;

    }

    return obj;
};