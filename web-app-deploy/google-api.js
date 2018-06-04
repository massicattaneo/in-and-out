const google = require('googleapis');
const calendar = google.calendar('v3');
const drive = google.drive('v2');
const googleSheets = google.sheets('v4');
const fs = require('fs');
const googleDb = require('./private/inandout-b97ef85c65d6.json');
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
            })
                .filter(i => i)
                .reduce((ret, item, index) => {
                    const col = cols[index];
                    if (col === 'titulo') {
                        ret['href'] = item.toLowerCase().trim()
                            .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
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
                            .replace(/ó/g, 'o')
                            .replace(/ü/g, 'u')
                            .replace(/ù/g, 'u')
                            .replace(/ú/g, 'u')
                            .replace(/\s/g, '-');
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
            const dest = fs.createWriteStream(__dirname + `${root}${fold.name}/${deviceType}.${item.originalFilename}`);
            const format = item.mimeType.replace('image/', '');
            const existsSync = fs.existsSync(__dirname + `${root}${fold.name}/${deviceType}.${item.originalFilename}`);
            if (existsSync) {
                return resolve({
                    url: `${root}${fold.name}/${deviceType}.${item.originalFilename}`,
                    name: item.originalFilename,
                    folder: fold.name
                });
            }

            const resizer = sharp().resize(imageWidth,
                parseInt((imageWidth / item.imageMediaMetadata.width) * item.imageMediaMetadata.height, 10))
                .rotate()[format]();
            drive.files.get({ fileId: item.id, alt: 'media' })
                .on('end', function () {
                    resolve({
                        url: `${root}${fold.name}/${deviceType}.${item.originalFilename}`,
                        name: item.originalFilename,
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

            drive.files.list({}, function (err, list) {
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
                    .map(function (i) {
                        // if (i.mimeType === 'application/vnd.google-apps.spreadsheet')
                        //     console.log(i.mimeType, i.id);
                        return i;
                    })
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
            processes
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
            sheets.products = modified[4] || [];
            sheets.press = modified[5] || [];
            sheets.bonusCards = modified[6] || [];
        });
    };

    obj.freeBusy = function ({ timestamp, calendars, timeFrame }) {
        return new Promise(function (res, rej) {
            const from = new Date(timestamp);
            const to = new Date(timestamp);
            from.setUTCHours(7, 0, 0, 0);
            to.setUTCHours(18, 0, 0, 0);
            const temp = {
                headers: { 'content-type': 'application/json' },
                resource: {
                    timeMin: timeFrame ? new Date(timeFrame.from).toISOString() : from.toISOString(),
                    timeMax: timeFrame ? new Date(timeFrame.to).toISOString() : to.toISOString(),
                    items: calendars.map(i => {
                        return { id: googleDb.calendars[i].id };
                    })
                }
            };
            calendar.freebusy.query(temp, function (err, data) {
                if (err) return rej(new Error('error'));
                if (!data) return rej(new Error('error'));
                const array = Object.keys(data.calendars).map(id => {
                    return {
                        id: googleDb.calendars.filter(item => item.id === id)[0].worker,
                        busy: data.calendars[id].busy
                    };
                }).reduce((ret, item) => {
                    ret[item.id] = item.busy;
                    return ret;
                }, {});
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
                // console.log('LOCATION INDEX', cal.locationIndex);
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
                return treat.titulo;
            })
            .join(' - ');
    };

    obj.calendarInsert = function ({ id, from, to, label, description = '', summary, processId = 97 }) {
        return new Promise(function (resolve, reject) {
            const params = {
                calendarId: id,
                resource: {
                    summary,
                    location: googleDb.centers[googleDb.calendars.filter(c => c.id === id)[0].location].address,
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
        const results = await Promise.all(googleDb.calendars.map(({ id }) => {
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
        const urls = Object.keys(appsManifest.apps).map(key => {
            return { url: `/es/${appsManifest.apps[key].url}`, changefreq: 'monthly', priority: 1 };
        });
        urls.push(...sheets.promotions.map(item => {
            return {
                url: `/es/promociones/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO(item.creacion)
            };
        }));
        urls.push(...sheets.treatments.map(item => {
            return {
                url: `/es/tratamientos/${item.tipo.toLowerCase()}/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO('01/05/2018')
            };
        }));
        urls.push(...sheets.bonusCards.map(item => {
            return {
                url: `/es/tarjetas/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO(item.desde)
            };
        }));
        urls.push(...sheets.beautyparties.map(item => {
            return {
                url: `/es/beauty-parties/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO('01/05/2018')
            };
        }));
        urls.push(...sheets.news.map(item => {
            return {
                url: `/es/novedades/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO(item.fecha)
            };
        }));
        urls.push(...sheets.press.map(item => {
            return {
                url: `/es/en-los-medios/${item.href}`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmodISO: getLastmodISO(item.fecha)
            };
        }));
        posts
            .filter(p => p.post_type === 'post')
            .forEach(function (post) {
            urls.push({
                url: `/${post.post_name}`,
                priority: 0.8,
                lastmodISO: getLastmodISO(post.post_date)
            })
        });
        return sm.createSitemap({
            hostname: 'https://www.inandoutbelleza.es/',
            cacheTime: 600000,
            urls
        });
    };

    function getTreatmentsList() {
        return new Promise(function (res, reject) {
            googleSheets.spreadsheets.get({
                spreadsheetId: '1nIQYlop5M1d1InuGzVAvR8-uQOgNaBrNYEEcC15bmb8',
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
                spreadsheetId: '1Bby3yuw3kf3primfpbN_4h04-M9UbrJZXiZXPot3FpI',
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
                spreadsheetId: '1ckXjaG3YaF1any7O3ESZ3gtrnzLkb2M-z5G6b-zG2XU',
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
                spreadsheetId: '1DSPMJQWDeBDe4fU7g1f-uDqE6dJYaN7VWoAF_IqGor8',
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
                spreadsheetId: '1EkHDQnTRNF5FupkFyiYET-bab4YRLwT31z2fmCeefa0',
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
                spreadsheetId: '1EofwLtBCxJ66sSCkFrYQ_QkVcGyZFsirGpqMktJW8ig',
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
                spreadsheetId: '1hKcwLjpDcmExPrrWN_msZOfilFhiCHodWBkzLTCIuxY',
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

    // obj.getCalendar = function (calendarId, datetime) {
    //     const cal = calendars[calendarId];
    //
    //     datetime.setHours(0,0,0,0);
    //     const timeMin = datetime.toISOString();
    //     datetime.setHours(23,59,59,999);
    //     const timeMax = datetime.toISOString();
    //     const params = {
    //         calendarId: cal.id,
    //         timeMin: timeMin,
    //         timeMax: timeMax,
    //         timeZone: cal.timeZone
    //     };
    //     calendar.events.list(params).then(function(d) {
    //         console.log(d);
    //     });
    //
    // };

    return obj;
};