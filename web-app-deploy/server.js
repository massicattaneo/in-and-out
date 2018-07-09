const { firebaseBonuses, firebaseClients, firebaseTransactions } = require('./firebaseImporter');
const { createICS } = require('./events/createICS');
const posts = require('./extras/posts.json');
const detector = require('spider-detector');
const path = require('path');
const utils = {};
const express = require('express');
const port = process.env.PORT || 8090;
const app = express();
const google = require('./google-api')(utils, posts);
const mailer = require('./mailer/mailer')();
const isDeveloping = process.env.NODE_ENV === 'development';
const mongo = require('./mongo')(isDeveloping, utils);
const bodyParser = require('body-parser');
const ExpressBrute = require('express-brute');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const LoginServices = require('./login-services');
const fs = require('fs');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const stripe = require('./stripe')();
const createTemplate = require('./mailer/createTemplate');
const QRCode = require('qrcode');
const googleDb = require('./private/new-hours.js');
const ObjectId = require('mongodb').ObjectID;
const createPdfOrder = require('./pdf/createPdfOrder');
const createPdfBills = require('./pdf/createPdfBills');
const parseCart = require('./pdf/parseCart');
const { formatItemForPdfBill, formatDateShort, convertNumber } = require('./pdf/common');
const https = require('https');
const http = require('http');
const urlParse = require('url');
const WebSocket = require('ws');
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};
const adminKeys = require('./private/adminKeys');
const createStaticHtmls = require('./seo/createStaticHtmls');
const members = require('./extras/members.json');
const wrongEmails = require('./extras/wrong.json');
const shared = require('./shared');
const BankSummary = require('./excel/bank-summary');
const BillSummary = require('./excel/bill-summary');
const CashSummary = require('./excel/cash-summary');

(async function () {
    const { store, db } = await mongo.connect();
    const bruteforce = new ExpressBrute(store, {
        freeRetries: 6,
        minWait: 500,
        maxWait: 60 * 1000, //milliseconds
        lifetime: 2 * 60 //seconds
    });

    // const startSever = http.createServer(function (req, res) {
    //     res.writeHead(503, { 'Content-Type': 'text/html' });
    //     res.write(fs.readFileSync(path.resolve(__dirname, '404.html'), 'utf8')); //write a response to the client
    //     res.end(); //end the response
    // });
    // startSever.listen(port, (err) => {
    //     console.log('startServer running');
    // });

    app.use(fileUpload());
    app.use(detector.middleware());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(session({
        cookie: { path: '/', httpOnly: true, secure: false, maxAge: Date.now() + (30 * 24 * 60 * 60 * 1000) },
        secret: adminKeys.sessionSecret,
        resave: true,
        saveUninitialized: false,
        store: new MongoStore({
            db: db
        })
    }));
    app.use(compression());
    app.use(function (req, res, next) {
        if (req.url === '/robots.txt') {
            res.type('text/plain');
            res.send(`User-agent: *\n
                    Disallow: /api/\n
                    Disallow: /google/calendar/\n
                    Disallow: /wp-content/\n
                    User-agent: *\n
                    Allow: /\n
                    Sitemap: https://www.inandoutbelleza.es/sitemap.xml`);
        } else {
            next();
        }
    });

    function requiresAdmin(req, res, next) {
        if (req.session && req.session.isAdmin) {
            return next();
        } else {
            req.session.destroy(function (err) {
                if (err) {
                    res.status(500);
                    return res.send('notAdmin');
                } else {
                    res.status(500);
                    return res.send('notAdmin');
                }
            });
        }
    }

    function requiresLogin(req, res, next) {
        if (req.session && req.session.userId) {
            return next();
        } else {
            req.session.destroy(function (err) {
                if (err) {
                    return res.send('anonymous');
                } else {
                    return res.send('anonymous');
                }
            });
        }
    }

    LoginServices({ app, google, mongo, mailer, bruteforce, requiresAdmin, requiresLogin });

    await google.authorize();
    await google.initCalendar();
    await google.initDrivePhotos();
    await google.initDriveSheets();
    // google.stubData();

    app.get('/api/posts/*', function (req, res) {
        const post_name = req.path.replace('/api/posts/', '');
        const post = posts.find(i => i.post_name === post_name);
        const images = post ? posts
            .filter(p => p.post_parent === post.ID)
            .filter(p => p.post_type === 'attachment') : [];
        res.send(JSON.stringify(Object.assign({ images }, post || {})));
    });

    app.get('/google/drive/*', function (req, res) {
        const file = __dirname + decodeURI(urlParse.parse(req.url).pathname);
        if (fs.existsSync(file)) {
            const s = fs.createReadStream(file);
            res.set('Content-Type', 'image/jpg');
            s.pipe(res);
        } else {
            res.status(404);
            res.send('');
        }
    });

    app.get('/api/public-db', async function (req, res) {

        if (req.session && req.session.isAdmin) {
            res.send(Object.assign({}, google.publicDb(), {
                reviews: await mongo.getReviewsInfo(),
                wrongEmails
            }));
        } else {
            res.send(Object.assign({}, google.publicDb(), {
                reviews: await mongo.getReviewsInfo()
            }));
        }
    });

    app.get('/api/reviews/*', function (req, res) {
        const start = Number(req.url.substr(req.url.lastIndexOf('/') + 1)) * 3;
        mongo.reviewsList()
            .then(function (list) {
                res.send(list.splice(start, 3));
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.get('/api/search/suggestion', function (req, res) {
        const word = req.query.q.toLowerCase();
        res.send(google.suggestions.filter(i => i.indexOf(word) !== -1).sort((a, b) => a.startsWith(word) ? -1 : 1));
    });

    app.get('/api/search/result', function (req, res) {
        const words = req.query.q.split(' ');
        res.send(google.getSearchResult(words));
    });

    app.post('/api/treatments/favourite',
        requiresLogin,
        function (req, res) {
            mongo.favouriteTreatment({
                treatmentId: req.body.id,
                value: req.body.value,
                userId: req.session.userId
            }).then(function () {
                res.send('ok');
            });
        });

    app.post('/api/language',
        requiresLogin,
        function (req, res) {
            mongo.rest.update('users', req.session.userId, { lang: req.body.lang });
            res.send('ok');
        });

    app.post('/api/reviews',
        requiresLogin,
        function (req, res) {
            mongo.insertReview({
                rate: req.body.rate,
                lang: req.body.lang,
                description: req.body.description,
                userId: req.session.userId
            })
                .then(function (review) {
                    res.send(review);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post('/google/get-hours',
        requiresLogin,
        function (req, res) {
            const { date, treatments, center } = req.body;
            const timeMin = new Date(date);
            timeMin.setUTCHours(7, 0, 0, 0);
            const timeMax = new Date(date);
            timeMax.setUTCHours(20, 0, 0, 0);
            const items = shared.getWorkers(googleDb, date, center)
                .map(w => {
                    return { id: googleDb.workers[w].googleId };
                });
            google
                .freeBusy({ timeMin, timeMax, items })
                .then(function (review) {
                    res.send(review);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post('/api/stripe/pay',
        async function (req, res) {
            const { token, email, sendTo, privacy, lang } = req.body;
            const cart = req.body.cart.map(id => Object.assign({ id, used: false }));
            const cartAmount = shared.getCartTotal(google.publicDb(), req.body.cart).total;
            const productsAmount = shared.getCartTotal(google.publicDb(), req.body.cart.filter(id => id.substr(0, 3) === 'PRD')).total;
            const freeChargeLimit = google.publicDb().settings.freeChargeLimit;
            const sendingCharge = google.publicDb().settings.sendingCharge;
            const amount = Math.floor((cartAmount + ((productsAmount < freeChargeLimit && productsAmount !== 0) ? sendingCharge : 0)) * 100);
            const { id } = await mongo.buy({ cart, userId: req.session.userId, email, amount, sendTo, lang });
            stripe.pay({ token, amount, orderId: id, cart, email })
                .then(async function (stripeRes) {
                    const emailParams = {
                        id,
                        email,
                        amount: stripeRes.amount,
                        cart,
                        googleDb: google.publicDb()
                    };
                    try {
                        await mongo.confirmBuy({
                            id,
                            stripeId: stripeRes.id,
                            amount: stripeRes.amount,
                            last4: stripeRes.source.last4
                        });
                        if (!privacy) {
                            const user = await mongo.rest.get('users', `email=${email}`);
                            if (user.length) await mongo.rest.update('users', user[0]._id, { privacy: true });
                        }
                        mailer.send(createTemplate('orderConfirmedEmail', emailParams));
                    } catch (e) {
                        console.log('ERROR ON CONFIRM BUY:', emailParams);
                    } finally {
                        delete emailParams.googleDb;
                        await res.send(emailParams);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.get('/api/bills/cash/:clientId/:date',
        requiresAdmin,
        async function (req, res) {
            const { clientId, date } = req.params;
            const { name, nif, cap, address, city } = req.query;
            const from = new Date(date);
            from.setHours(2, 0, 0, 0);
            const to = new Date(date);
            to.setHours(23, 0, 0, 0);
            const table = 'cash';
            const cashEntries = await mongo.rest.get(table, `clientId=${clientId}&date>${from.getTime()}&date<${to.getTime()}`);
            if (cashEntries.length === 0) return res.send('<html><body>SELECCIONA OTRA FECHA</body></html>');
            let billNumber = (cashEntries.find(cash => cash.billNumber) || { billNumber: '' }).billNumber;
            const isOld = to.getTime() < (new Date('2019-07-01').getTime());
            if (!billNumber && !isOld) {
                billNumber = (await mongo.nextBillNumber(cashEntries[0].user)).billNumber;
            }
            const user = (await mongo.rest.get('users', `_id=${cashEntries[0].clientId}`) || [])[0];
            await Promise.all(cashEntries.map(cash => mongo.rest.update(table, cash._id, { billNumber })));
            const userInfo = Object.assign({ nif, cap, address, city }, user);
            userInfo.name = name ? name : userInfo.name;
            userInfo.surname = name ? '' : userInfo.surname;
            const formatted = formatItemForPdfBill(cashEntries, billNumber, formatDateShort(from), userInfo);
            createPdfBills(res, [formatted]);
        });

    app.get('/api/bills/orders/:id',
        requiresAdmin,
        async function (req, res) {
            const { id } = req.params;
            const { name, nif, cap, address, city } = req.query;
            const [order] = await mongo.rest.get('orders', `_id=${id}`) || [];
            let { userId, billNumber = '', created, payed, cart, email } = order;
            if (!payed) return res.send('<html><body>EL ORDEN NO ESTA FINALIZADO</body></html>');
            const noUser = { name: '', surname: email };
            const user = userId ? (await mongo.rest.get('users', `email=${email}`) || [])[0] : noUser;
            const centerId = 'online';
            const isOld = (new Date(created)).getTime() < (new Date('2019-07-01').getTime());
            if (!billNumber && !isOld) {
                billNumber = (await mongo.nextBillNumber(centerId)).billNumber;
            }
            await mongo.rest.update('orders', id, { billNumber });
            const products = parseCart(cart, google.publicDb());
            const entries = products.map(({ count, type, title, category, price }) => {
                return {
                    user: centerId,
                    type: 'tarjeta',
                    description: `${count} x ${category ? `${category}: ` : ''}${title}`,
                    amount: Number(price)
                };
            });
            const userInfo = Object.assign({ nif, cap, address, city }, user);
            userInfo.name = name ? name : userInfo.name;
            userInfo.surname = name ? '' : userInfo.surname;
            const formatted = formatItemForPdfBill(entries, billNumber, formatDateShort(new Date(created)), userInfo);
            createPdfBills(res, [formatted]);
        });

    app.get('/api/pdf/*',
        async function (req, res) {
            const orderId = req.url.substr(req.url.lastIndexOf('/') + 1);
            const filePath = `${__dirname}/order-qr-codes/${orderId}.png`;
            if (!fs.existsSync(filePath)) {
                await QRCode.toFile(filePath, `${orderId}`);
            }
            const order = await mongo.getOrderInfo(orderId);
            createPdfOrder(res, google.publicDb(), orderId, order);
        });

    app.post('/google/calendar/insert',
        requiresLogin,
        async function (req, res) {
            const offset = -shared.getSpainOffset();
            const { treatments, start, locationIndex } = req.body;
            const { name, tel, email } = await mongo.getUser({ _id: new ObjectId(req.session.userId) });
            const workers = shared.getWorkersByHour(googleDb, start, locationIndex);
            const all = google.publicDb().treatments;
            const dateMin = new Date(start);
            const items = workers
                .filter(w => shared.getTreatmentsDuration(googleDb, all, treatments, w) > 0)
                .map(w => {
                    return { id: googleDb.workers[w].googleId, workerIndex: w };
                });
            let busy;
            let workerIndex;
            for (let i = 0; i < items.length; i++) {
                workerIndex = items[i].workerIndex;
                const treatDur = shared.getTreatmentsDuration(googleDb, all, treatments, workerIndex);
                busy = await google.freeBusy({
                    timeMin: dateMin.toISOString(),
                    timeMax: (new Date(dateMin.getTime() + treatDur * 60 * 1000)).toISOString(),
                    items: [{ id: items[i].id }]
                });
                if (busy.filter(i => !i || i.length === 0).length) break;
                workerIndex = undefined;
            }

            if (workerIndex === undefined) {
                res.status(500);
                console.log(treatments, start, locationIndex, busy, workerIndex);
                res.send('error');
                return;
            }
            const label = google.getTreatmentsLabel(treatments);
            google.calendarInsert({
                id: googleDb.workers[workerIndex].googleId,
                from: dateMin.toISOString(),
                to: new Date(dateMin.getTime() + shared.getTreatmentsDuration(googleDb, all, treatments, workerIndex) * 60 * 1000).toISOString(),
                summary: `${name} (TEL. ${tel}) ${label}`,
                description: email,
                label
            }).then(async (e) => {
                res.send(e);
                const date = new Date(new Date(e.start).getTime() - (((-shared.getSpainOffset()) + google.publicDb().serverOffset) * 60 * 60 * 1000));
                const event = {
                    bookId: e.eventId,
                    clientName: name,
                    description: e.label,
                    email,
                    startDate: new Date(new Date(e.start).getTime() - (offset * 60 * 60 * 1000)).toISOString(),
                    endDate: new Date(new Date(e.end).getTime() - (offset * 60 * 60 * 1000)).toISOString(),
                    formattedDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
                    formattedHour: `${date.getHours()}:${date.getMinutes().toString().length === 1 ? `0${date.getMinutes()}` : date.getMinutes()}`,
                    location: e.location
                };

                const filePath = path.resolve(__dirname, `temp/${e.eventId}.ics`);
                const attachments = [{ filename: 'Cita.ics', path: filePath }];
                fs.writeFileSync(filePath, createICS(event), 'utf8');
                const emailTemplate = createTemplate('bookReminder', { email, event, attachments });
                mailer.send(emailTemplate);
            }).catch((e) => {
                res.status(500);
                console.log('error', e);
                res.send('error');
            });
        });

    app.post('/google/calendar/delete',
        requiresLogin,
        async function (req, res) {
            const { eventId, calendarId } = req.body;
            google
                .calendarDelete({ eventId, calendarId })
                .then(() => {
                    res.send('ok');
                })
                .catch(() => {
                    res.status(500);
                    res.send('error');
                });
        });

    app.post('/google/calendar/get',
        requiresAdmin,
        async function (req, res) {
            const { timestamp, calendarId } = req.body;
            google
                .calendarGet(calendarId, new Date(timestamp))
                .then((r) => {
                    res.send(r);
                })
                .catch((e) => {
                    res.status(500);
                    res.send('error');
                });
        });

    app.post('/google/calendar/add',
        requiresAdmin,
        async function (req, res) {
            const { duration, calendarId, date, summary, label = '', processId, description } = req.body;
            const from = new Date(date);
            google.calendarInsert({
                id: calendarId,
                from: from.toISOString(),
                to: new Date(from.getTime() + duration).toISOString(),
                summary,
                description,
                label,
                processId
            })
                .then((e) => {
                    res.send(e);
                })
                .catch(() => {
                    res.status(500);
                    res.send('error');
                });
        });


    app.get(
        '/api/qr-code/*',
        async function (req, res) {
            const order = req.url.substr(req.url.lastIndexOf('/') + 1);
            await QRCode.toFile(`${__dirname}/order-qr-codes/${order}.png`, `${order}`);
            const stream = fs.createReadStream(`${__dirname}/order-qr-codes/${order}.png`);
            stream.pipe(res);
            stream.on('data', data => res.write(data, 'binary'));
            stream.on('end', () => res.end());
        });

    app.get('/api/adminDb',
        requiresAdmin,
        async function (req, res) {
            res.send({
                clients: await mongo.getAll('users'),
                orders: await mongo.getAll('orders'),
                reminders: await mongo.getAll('reminders'),
                bills: await mongo.getAll('bills')
            });
        });

    app.get('/api/rest/*',
        requiresAdmin,
        async function (req, res) {
            const path = decodeURI(req.url).substr(10, 1000000).split('?');
            mongo.rest.get(path[0], path[1])
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.get('/sitemap.xml', function (req, res) {
        google.createSitemap().toXML(function (err, xml) {
            if (err) {
                return res.status(500).end();
            }
            res.header('Content-Type', 'application/xml');
            res.send(xml);
        });
    });

    app.post('/api/rest/*',
        requiresAdmin,
        async function (req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 1];
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            mongo.rest.insert(table, Object.assign(req.body, { ip }))
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.put('/api/rest/*',
        requiresAdmin,
        async function (req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 2];
            const id = paths[paths.length - 1];
            mongo.rest.update(table, id, req.body)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.delete('/api/rest/*',
        requiresAdmin,
        async function (req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 2];
            const id = paths[paths.length - 1];
            mongo.rest.delete(table, id)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post('/api/newsletter',
        requiresAdmin,
        async function (req, res) {
            const emails = await mongo.getEmails();
            const allMembers = members.concat(emails)
                .filter(e => wrongEmails.indexOf(e) === -1)
                .filter((e, i, a) => a.indexOf(e) === i);
            const bcc = (req.body.test ? req.body.emails : allMembers);
            if (!req.body.test) {
                console.log('SENDING NEWSLETTER');
            }

            const newArray = [];
            while (bcc.length) {
                newArray.push(bcc.splice(0, 49));
            }

            newArray.forEach(function (email, index) {
                const bcc = email;
                setTimeout(function () {
                    try {
                        const emailTemplate = createTemplate('newsLetterEmail', {
                            bcc: bcc,
                            subject: req.body.subject,
                            html: req.body.html
                        });
                        mailer.send(emailTemplate);
                        console.log('NEWSLETTER SENT', bcc);
                    } catch (e) {
                        console.log('ERROR NEWSLETTER', bcc, e);
                    }
                }, index * 60 * 1000);
            });
            res.send('ok');
        }
    );

    app.post('/api/email/:type',
        requiresAdmin,
        async function (req, res) {
            const emailTemplate = createTemplate(req.params.type, Object.assign({
                bcc: 'info@inandoutbelleza.com'
            }, req.body));
            mailer.send(emailTemplate);
            res.send('ok');
        });

    app.get('/api/upload/*',
        requiresAdmin,
        async function (req, res) {
            const path = decodeURIComponent(req.url.replace('/api/upload/', ''));
            // const file = await dropbox.download(path);
            // res.type('pdf');
            // res.end(file.fileBinary, 'binary');
        });

    app.post('/api/upload-bank',
        requiresAdmin,
        async function (req, res) {
            const accounts = {
                '0182- 410-1 -40 0201602867': 'main',
                '0182- 410-1 -41 0201599433': 'secondary',
                '': 'unknown'
            };
            const { data } = req.files.fileUpload;
            const buffer = new Buffer(data);
            const accountNumber = (buffer.toString().match(/Cuenta\s*:\s*([^EUR]*)\sEUR/) || ['', ''])[1];
            const account = accounts[accountNumber];
            const docs = buffer.toString()
                .split('\n')
                .filter(line => line.match(/^\d\d\/\d\d\/\d\d\d\d/))
                .map(function (line) {
                    const arr = line.split('\t');
                    return {
                        accountingDate: new Date(arr[0].split('/').reverse().join('-')),
                        key: arr[2],
                        description: arr[3],
                        note: arr[4].replace('\t', '').replace(/\s+/, '').trim().replace(/'/g, ''),
                        valueDate: new Date(arr[1].split('/').reverse().join('-')),
                        amount: convertNumber(arr[6]),
                        office: arr[5].replace(/'/g, ''),
                        account,
                        accountNumber
                    };
                });
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                await new Promise(resolve => db.collection('bank').update(doc, doc, { upsert: true }, resolve));
            }
            res.send({});
        });

    app.get('/api/summary/banco.xlsx',
        requiresAdmin,
        async function (req, res) {
            const from = new Date(Number(req.query.from));
            const to = new Date(Number(req.query.to));
            const buffer = await BankSummary(db, google, {
                from: from.getTime(),
                to: to.getTime(),
                title: `BANCO ${formatDateShort(from)} - ${formatDateShort(to)}`
            });
            res.send(buffer);
        });

    app.get('/api/summary/facturas_compra.xlsx',
        requiresAdmin,
        async function (req, res) {
            const { excelBuffer } = await BillSummary(db, google, {
                title: `FACTURAS DE COMPRA`
            });
            res.send(excelBuffer);
        });

    app.get('/api/summary/facturas_compra.pdf',
        requiresAdmin,
        async function (req, res) {
            const { pdfBuffer } = await BillSummary(db, google, {
                title: `FACTURAS DE COMPRA`
            });
            res.send(pdfBuffer);
        });

    app.get('/api/summary/facturas_venta.pdf',
        requiresAdmin,
        async function (req, res) {
            const from = new Date(Number(req.query.from));
            const to = new Date(Number(req.query.to));
            const maxCashAmount = Number(Number(req.query.maxCashAmount));
            const saveBillNumbers = req.query.saveBillNumbers === 'true';
            const { pdfBuffer } = await CashSummary(db, google, {
                from: from.getTime(),
                to: to.getTime(),
                maxCashAmount,
                saveBillNumbers
            });
            res.send(pdfBuffer);
        });

    app.get('/api/summary/facturas_venta.xlsx',
        requiresAdmin,
        async function (req, res) {
            const from = new Date(Number(req.query.from));
            const to = new Date(Number(req.query.to));
            const maxCashAmount = Number(Number(req.query.maxCashAmount));
            const saveBillNumbers = req.query.saveBillNumbers === 'true';
            const { excelBuffer } = await CashSummary(db, google, {
                from: from.getTime(),
                to: to.getTime(),
                maxCashAmount,
                saveBillNumbers
            });
            res.send(excelBuffer);
        });

    app.get('/api/summary/cash_summary.html',
        requiresAdmin,
        async function (req, res) {
            const from = new Date(Number(req.query.from));
            const to = new Date(Number(req.query.to));
            const maxCashAmount = Number(Number(req.query.maxCashAmount));
            const { report } = await CashSummary(db, google, {
                from: from.getTime(),
                to: to.getTime(),
                maxCashAmount
            });
            res.send(report);
        });

    app.post('/api/upload',
        requiresAdmin,
        async function (req, res) {
            const name = req.files.fileUpload.name;
            const ext = path.extname(name);
            google.upload(name, req.files.fileUpload.data, ext).then(async function (googleRef) {
                const file = await mongo.rest.insert('uploads', { name, ext, googleRef });
                res.send(file);
            }).catch(console.log);
        });

    app.delete('/api/upload/:id',
        requiresAdmin,
        async function (req, res) {
            const id = req.params.id;
            const file = await mongo.rest.delete('uploads', id);
            await google.delete(file.googleRef);
            res.send(file);
        });

    let callback;
    if (isDeveloping) {
        callback = require('../webpack/dev-server')(app, express, google, posts);
    } else {
        const textFile = fs.readFileSync(path.join(__dirname, 'static/templates/index.html'), 'utf8');
        const htmls = createStaticHtmls(textFile, google, posts);
        app.use(express.static(__dirname + '/static', {
            maxage: 365 * 24 * 60 * 60 * 1000,
            etag: false
        }));
        callback = function response(req, res) {
            const isAdmin = req.path.substr(0, 6) === '/admin';
            if (req.headers['x-forwarded-proto'] === 'http' && !req.isSpider()) {
                res.redirect(`https://${req.headers.host}${req.url}`);
            } else if (isAdmin) {
                res.sendFile(path.join(__dirname, 'static/templates/admin.html'));
            } else {
                if (req.isSpider()) {
                    console.log('***** CRAWLER: requesting:', req.path);
                }
                res.write(createStaticHtmls.addCss(htmls[req.path] || htmls[''], req.isSpider()));
                res.end();
            }
        };
    }
    app.get('*', callback);

    // await (new Promise(function (resolve) {
    //     startSever.close(function () {
    //         console.log('PEPE',...arguments)
    //         resolve();
    //     });
    // }));

    const server = http.createServer(app).listen(port, () => {
        console.log('http server running at ' + port);
    });

    // const httpsPort = 8091;
    // const server = https.createServer(httpsOptions, app).listen(httpsPort, () => {
    //     console.log('https server running at ' + httpsPort)
    // });

    function noop() {
    }

    function heartbeat() {
        this.isAlive = true;
    }

    utils.wss = new WebSocket.Server({ server });

    utils.wss.on('connection', function connection(ws) {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
    });

    const intervalCheckWss = setInterval(function ping() {
        utils.wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping(noop);
        });
    }, 5 * 1000);

    utils.wss.broadcast = function broadcast(data) {
        utils.wss.clients.forEach(function each(ws) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data, function ack(error) {
                    if (error) {
                        console.log('error', error);
                    }
                });
            }
        });
    };

    // try {
    //     await firebaseClients(mongo);
    //     await firebaseTransactions(mongo);
    //     await firebaseBonuses(mongo);
    // } catch(e){
    //     console.log('error', e)
    // }

    console.log('finish - timezone offset:', (new Date().getTimezoneOffset() / 60));
})();
