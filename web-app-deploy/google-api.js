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

async function resizeUpload(ext, resource) {
    if (ext === '.jpg' || ext === '.png' || ext === '.jpeg') {
        return await sharp(resource).resize(1200).toBuffer();
    }
    return resource;
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
                let pageToken = list.nextPageToken;
                while (pageToken) {
                    await new Promise(function (resolve) {
                        drive.files.list({ pageToken }, (err, l) => {
                            list.items.push(...l.items);
                            pageToken = l.nextPageToken;
                            resolve();
                        });
                    });
                }

                const folders = list.items
                    .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
                    .filter(item => item.title !== 'website')
                    .filter(item => item.title !== 'uploads')
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
                        if (item.parents.length === 0) return () => Promise.resolve();
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
            serverTimestamp: new Date().getTime(),
            serverOffset: -(new Date().getTimezoneOffset() / 60),
            processes,
            settings: {
                freeChargeLimit: 100,
                sendingCharge: 4.99
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
                if (!data.calendars) return rej(new Error('error'));
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

    obj.calendarInsert = function ({ id, from, to, label, description = '', summary, processId = 97, treatments = [], clientId = "", blockedWith = "" }) {
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
                    extendedProperties: { private: { processId, label, treatments: JSON.stringify(treatments), clientId, blockedWith } }
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
                    processId,
                    treatments: JSON.stringify(treatments)
                };
                utils.wss.broadcast(JSON.stringify({ type: 'insertEvent', data: evt }));
                resolve(evt);
            });
        });
    };

    obj.calendarUpdateTime = function ({ id, from, to, eventId, summary, location, description, extendedProperties }) {
        return new Promise(function (resolve, reject) {
            const params = {
                calendarId: id,
                eventId,
                resource: {
                    start: { 'dateTime': (new Date(from)).toISOString() },
                    end: { 'dateTime': (new Date(to)).toISOString() },
                    summary,
                    location,
                    description,
                    extendedProperties
                }
            };
            calendar.events.update(params, function (e, o) {
                if (e) return reject(new Error('error'));
                resolve(o);
            });
        });
    };

    obj.calendarDelete = function ({ eventId, calendarId, timestamp }) {
        return new Promise(function (resolve, reject) {
            calendar.events.delete({ eventId, calendarId }, function (e, o) {
                utils.wss.broadcast(JSON.stringify({ type: 'deleteEvent', data: { calendarId, eventId, date: timestamp } }));
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
        const timeMinDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        if (!hash) return [];
        const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!emailRegEx.test(hash)) return [];
        const results = await Promise.all(googleDb.workers.map(({ googleId: id }) => {
            return new Promise(function (resolve, reject) {
                const calendarId = id;
                calendar.events.list({
                    calendarId,
                    timeMin: (timeMinDate).toISOString(),
                    q: hash
                }, function (err, o) {
                    if (err) { 
                        console.log(err)
                        return reject(new Error('error'));
                    }
                    resolve(o.items.map(({ id, summary, extendedProperties, location, start, end }) => {
                        return {
                            eventId: id,
                            calendarId,
                            summary: summary, location,
                            start: new Date(start.dateTime).toISOString(),
                            end: new Date(end.dateTime).toISOString(),
                            label: (extendedProperties && extendedProperties.private) ? extendedProperties.private.label || "" : "",
                            treatments: (extendedProperties && extendedProperties.private) ? JSON.parse(extendedProperties.private.treatments || JSON.stringify([])) || [] : []
                        };
                    }));
                });
            });
        }));
        return results.reduce((a, b) => a.concat(b), []);
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

    obj.upload = function (title, resource, ext) {
        return new Promise(async function (resolve, reject) {
            drive.files.insert({
                resource: {
                    title,
                    parents: [{ id: googleDb.uploadFolderId }]
                },
                media: {
                    body: await resizeUpload(ext, resource)
                }
            }, function (err, file) {
                if (err) return reject(err);
                if (!file) return reject('generic');
                resolve(file.id);
            });
        });
    };

    obj.delete = function (fileId) {
        return new Promise(function (resolve, reject) {
            drive.files.trash({ fileId }, function (err, done) {
                if (err) reject(new Error('generic'));
                resolve(done);
            });
        });
    };

    obj.download = function (fileId) {
        return drive.files.get({ fileId, alt: 'media' });
    };

    obj.shareFile = function (fileId) {
        return new Promise(function (resolve, reject) {
            drive.files.get({ fileId }, function (err, done) {
                if (err) resolve('generic ' + fileId);
                if (!done) return resolve('MISSING');
                resolve(done.alternateLink);
            });
        });
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
                // res(JSON.parse(fs.readFileSync('./temp.json')));
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
