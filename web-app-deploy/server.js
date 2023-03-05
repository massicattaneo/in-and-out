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
const http = require('http');
const urlParse = require('url');
const WebSocket = require('ws');
const adminKeys = require('./private/adminKeys');
const shared = require('./shared');
const BankSummary = require('./excel/bank-summary');
const BillSummary = require('./excel/bill-summary');
const CashSummary = require('./excel/cash-summary');

async function sendCommunication(clientId, type, action, body, onError = () => true, onSuccess = () => true) {
    const [user] = await mongo.rest.get('users', `_id=${clientId}`);
    if (!user) onError("error");
    if (type === "email") {
        const { _id } = await mongo.rest.insert("communications", { type, action, clientId, date: Date.now(), sent: true, data: body });
        mailer.send(createTemplate(action, body))
            .then(() => {
                onSuccess("ok");
            }).catch(async () => {
                await mongo.rest.update("communications", _id, { sent: false });
                onError("error");
            });

    } else {
        onError("error");
    }
}

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

    function requiresSuperAdmin(req, res, next) {
        if (req.session && req.session.isAdmin && req.session.adminLevel === 2) {
            return next();
        }
    }

    function requiresLogin(req, res, next) {
        if (req.session && req.session.userId) {
            return next();
        } else {
            req.session.destroy(function (err) {
                res.status(500);
                return res.send('anonymous');
            });
        }
    }

    LoginServices({ app, google, mongo, mailer, bruteforce, requiresAdmin, requiresLogin, isDeveloping });

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
        res.send(Object.assign({}, google.publicDb(), {
            adminUsers: googleDb.adminUsers,
            reviews: await mongo.getReviewsInfo(),
            barcodes: await mongo.getBarCodes(google.publicDb()),
            cartPriority: await mongo.cartPriority(),
            posts: posts.filter(i => i.post_type === 'post')
        }));
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
        function (req, res) {
            const { date, treatments, center } = req.body;
            const timeMin = new Date(date);
            timeMin.setUTCHours(7, 0, 0, 0);
            const timeMax = new Date(date);
            timeMax.setUTCHours(20, 0, 0, 0);
            const workers = center !== undefined ? shared.getWorkers(googleDb, date, center) : shared.getDayWorkers(googleDb, date)
            const items = workers
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

    app.post('/api/stripe/secret', async function (req, res) {
        const { email, sendTo, cart } = req.body;
        const cartAmount = shared.getCartTotal(google.publicDb(), cart).total;
        const productsAmount = shared.getCartTotal(google.publicDb(), cart.filter(id => id.substr(0, 3) === 'PRD')).total;
        const freeChargeLimit = google.publicDb().settings.freeChargeLimit;
        const sendingCharge = google.publicDb().settings.sendingCharge;
        const amount = Math.floor((cartAmount + ((productsAmount < freeChargeLimit && productsAmount !== 0) ? sendingCharge : 0)) * 100);
        const mongoCart = req.body.cart.map(id => Object.assign({ id, used: false }));
        const { id: orderId } = await mongo.buy({ cart: mongoCart, email, amount, sendTo });
        stripe.clientSecret({ amount })
            .catch(err => {
                console.log(err);
                res.status(500);
                res.send(err.message);
            })
            .then(secretObject => {
                res.json(Object.assign(secretObject, { orderId }));
            });
    });

    app.post('/api/stripe/payment-done',
        async function (req, res) {
            const { email, privacy, orderId, paymentIntent } = req.body;
            const cart = req.body.cart.map(id => Object.assign({ id, used: false }));
            const cartAmount = shared.getCartTotal(google.publicDb(), req.body.cart).total;
            const productsAmount = shared.getCartTotal(google.publicDb(), req.body.cart.filter(id => id.substr(0, 3) === 'PRD')).total;
            const freeChargeLimit = google.publicDb().settings.freeChargeLimit;
            const sendingCharge = google.publicDb().settings.sendingCharge;
            const amount = Math.floor((cartAmount + ((productsAmount < freeChargeLimit && productsAmount !== 0) ? sendingCharge : 0)) * 100);
            const emailParams = {
                id: orderId,
                email,
                amount,
                cart,
                googleDb: google.publicDb()
            };
            try {
                let [userFromSessionId] = ""
                if (req.session.userId) {
                    try {
                        [userFromSessionId] = await mongo.rest.get('users', `_id=${new ObjectId(req.session.userId)}`);
                    } catch (e) {
                        //DO NOTHING
                    }
                }
                const [userFromEmail] = await mongo.rest.get('users', `email=${email}`);
                if (!userFromSessionId && !userFromEmail) {
                    await mongo.insertOrderOnlineUser({ email })
                }
                const [newUserFromEmail] = await mongo.rest.get('users', `email=${email}`);
                const newUser = userFromSessionId || newUserFromEmail
                await mongo.confirmBuy({
                    id: new ObjectId(orderId),
                    stripeId: paymentIntent.id,
                    amount: paymentIntent.amount,
                    last4: '',
                    userId: newUser._id
                });
                await mongo.rest.insert("cash", {
                    clientId: newUser._id,
                    date: Date.now(),
                    description: 'Compra online',
                    type: 'stripe',
                    user: 'online',
                    amount: paymentIntent.amount / 100,
                    orderId,
                    cart: cart.map(item => item.id)
                })
                mailer.send(createTemplate('orderConfirmedEmail', emailParams));
            } catch (error) {
                console.log('ERROR SENDING EMAIL ON CONFIRM BUY:', error);
            } finally {
                delete emailParams.googleDb;
                await res.send(emailParams);
            }
        });
    
    app.post("/api/communications/preview/:type/:action",
        requiresAdmin,
        async function (req, res) {
            const { type, action } = req.params;
            if (type === "email") {
                const preview = createTemplate(action, req.body)
                return res.send(preview)
            }
            res.send("")
        }
    )

    app.post("/api/communications/send/:type/:action/:clientId",
        requiresAdmin,
        async function (req, res) {
            const { type, action, clientId } = req.params;
            await sendCommunication(clientId, type, action, req.body, () => {
                res.status(500);
                res.send("error");
            }, () => {
                res.send("ok")
            });
        }
    )

    app.get('/api/pdf/bill/:clientId/:timestamp', async function (req, res) {
            const { clientId, timestamp } = req.params;
            const from = shared.getSpainDate(Number(timestamp), 0)
            const to = shared.getSpainDate(Number(timestamp), 23.99999)
            const cashEntries = await mongo.rest.get('cash', `clientId=${clientId}&date>${from.getTime()}&date<${to.getTime()}`);
            const user = (await mongo.rest.get('users', `_id=${clientId}`) || [])[0];
            if (!user || cashEntries.length === 0 || !cashEntries[0].billInfo || !cashEntries[0].billNumber) return res.send('<html><body>ESTA FACTURA NO EXISTE</body></html>');
            const formatted = formatItemForPdfBill(cashEntries, cashEntries[0].billNumber, formatDateShort(from), cashEntries[0].billInfo);
            createPdfBills(res, [formatted]);
    });
    
    app.get('/api/last-bill-numbers',
        requiresAdmin,
        async (req, res) => {
            const response = await Promise.all(googleDb.centers
                .filter(cent => !cent.closed)
                .map(center => {
                    return mongo.getActualBillNumber(center.id)
                }))
            res.json(response)
        }
    )

    app.post('/api/download-bills',
        requiresAdmin, 
        async function (req, res) {
            const { billNumbers } = req.body
            const array = await Promise.all(billNumbers.map(async billNumber => {
                const cashEntries = await db.collection('cash').aggregate([{ $match: { billNumber: Number(billNumber) } }]).toArray()
                return formatItemForPdfBill(cashEntries, billNumber, formatDateShort(new Date(cashEntries[0].date)), cashEntries[0].billInfo);
            }))
            createPdfBills(res, array);
        })
    app.post('/api/generate-bills',
        requiresAdmin,
        async function(req, res) {
            const { ids } = req.body
            const cashItems = (await Promise.all(ids.map(async (id) => {
                const [cashItem] = await mongo.rest.get('cash', `_id=${id}`);
                return cashItem
            }))).filter(item => item).sort((first, second) => first.date - second.date)
            await cashItems.reduce(async (prev, cashItem) => { 
                await prev
                const billInfoUser = ids.find(sub => sub.clientId === cashItem.clientId && sub.billInfo)
                let cashEntries = [cashItem]
                if (cashItem.clientId) {
                    const from = shared.getSpainDate(Number(cashItem.date), 0)
                    const to = shared.getSpainDate(Number(cashItem.date), 23.99999)
                    cashEntries = await db.collection('cash').aggregate([
                        { $match: { clientId: cashItem.clientId, date: { $gte: from.getTime(), $lte: to.getTime() } } }
                    ]).toArray()
                    if (!cashEntries.length) {
                        cashEntries = [cashItem]
                    }
                }
                const [client = {}] = await mongo.rest.get('users', `_id=${cashItem.clientId}`);
                const billInfo = {
                    name: `${client.name || ""} ${client.surname || ""}`.trim() || "Sin contacto",
                    ...cashItem.billInfo,
                    ...billInfoUser?.billInfo,
                }
                let billNumber = (cashEntries.find(cash => cash.billNumber) || { billNumber: 0 }).billNumber;
                if (!billNumber) {
                    const { billRef, number } = await mongo.getActualBillNumber(cashEntries[0].user)
                    billNumber = shared.generateBillNumber(billRef, number + 1);
                }
                await Promise.all(cashEntries.map(cash => mongo.rest.update('cash', cash._id, { billNumber, billInfo })));
            }, Promise.resolve())
                .then(() => {
                    res.json({})
                })
                .catch((error) => {
                    console.log(error)
                    res.status(500)
                    res.send(error)
                })
        },
    )

    app.get('/api/bills/cash/:clientId/:timestamp',
        requiresAdmin,
        async function (req, res) {
            const { clientId, timestamp } = req.params;
            const { name = "", nif = "", cap = "", address = "", city = "" } = req.query;
            const from = shared.getSpainDate(Number(timestamp), 0)
            const to = shared.getSpainDate(Number(timestamp), 23.99999)
            const cashEntries = await mongo.rest.get('cash', `clientId=${clientId}&date>${from.getTime()}&date<${to.getTime()}`);
            if (cashEntries.length === 0) return res.send('<html><body>SELECCIONA OTRA FECHA</body></html>');
            let billNumber = (cashEntries.find(cash => cash.billNumber) || { billNumber: 0 }).billNumber;
            if (!billNumber) {
                const { billRef, number } = await mongo.getActualBillNumber(cashEntries[0].user)
                billNumber = shared.generateBillNumber(billRef, number + 1);
            }
            const user = (await mongo.rest.get('users', `_id=${cashEntries[0].clientId}`) || [])[0];
            const userInfo = Object.assign({ nif, cap, address, city }, user);
            userInfo.name = name ? name : userInfo.name;
            userInfo.surname = name ? '' : userInfo.surname;
            const billInfo = Object.assign({ nif, cap, address, city }, { name: name || `${user.name || ""} ${user.surname || ""}` });
            await Promise.all(cashEntries.map(cash => mongo.rest.update('cash', cash._id, { billNumber, billInfo })));
            const formatted = formatItemForPdfBill(cashEntries, billNumber, formatDateShort(from), userInfo);
            createPdfBills(res, [formatted]);
        });

    app.get('/api/pdf/*',
        async function (req, res) {
            const orderId = req.url.substr(req.url.lastIndexOf('/') + 1);
            const filePath = `${__dirname}/order-qr-codes/${orderId}.png`;
            if (!fs.existsSync(filePath)) {
                await QRCode.toFile(filePath, `${orderId}`);
            }
            if (orderId === 'exemplo') {
                createPdfOrder(res, google.publicDb(), orderId, []);
            } else {
                const { cart } = await mongo.getOrderInfo(orderId);
                createPdfOrder(res, google.publicDb(), orderId, cart);    
            }
        });
    
    app.get('/api/orders/products/unsent',
        requiresAdmin,
        async (req, res) => {
            return res.json(await mongo.unsentProductOrders())
    })

    app.post('/google/calendar/insert',
        requiresLogin,
        async function (req, res) {
            const offset = -shared.getSpainOffset();
            const { treatments, start, locationIndex } = req.body;
            const { name, tel, email } = await mongo.getUser({ _id: new ObjectId(req.session.userId) });
            if (!email) {
                res.status(500);
                res.send('error');
                return;
            }
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
                label,
                treatments,
                clientId: req.session.userId
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
                // TODO fix date for ICS
                // const filePath = path.resolve(__dirname, `temp/${e.eventId}.ics`);
                // const attachments = [{ filename: 'Cita.ics', path: filePath }];
                // fs.writeFileSync(filePath, createICS(event), 'utf8');
                const emailTemplate = createTemplate('bookReminder', { email, event });
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
            google
                .calendarDelete(req.body)
                .then(() => {
                    res.send('ok');
                })
                .catch(() => {
                    res.status(500);
                    res.send('error');
                });
        });

    app.post('/google/calendar/get-all',
        requiresAdmin,
        async function (req, res) {
            const { date, calendars } = req.body;
            Promise.all(calendars.map((calendarId) => {
                return google.calendarGet(calendarId, new Date(date))
            })).then(data => {
                const r = calendars.reduce((acc, id, index) => {
                    return Object.assign(acc, { [id]: data[index] })
                }, {})
                res.send(r)
            }).catch(() => {
                res.status(500);
                res.send('error');
            })
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
            const { duration, calendarId, date, summary, label = '', processId, description, treatments = [], clientId = "", blockedWith = "" } = req.body;
            const from = new Date(date);
            google.calendarInsert({
                id: calendarId,
                from: from.toISOString(),
                to: new Date(from.getTime() + duration).toISOString(),
                summary,
                description,
                label,
                processId,
                treatments,
                clientId,
                blockedWith
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
                bills: await mongo.getAll('bills'),
                actualCash: {
                    salitre: Math.min(4000, await mongo.getActualCash('salitre')),
                    buenaventura: Math.min(4000, await mongo.getActualCash('buenaventura')),
                    portanueva: Math.min(4000, await mongo.getActualCash('portanueva')),
                }
            });
        });
    
    app.get('/api/actual-cash',
        requiresAdmin,
        async function (req, res) {
            res.send({
                salitre: Math.min(4000, await mongo.getActualCash('salitre')),
                buenaventura: Math.min(4000, await mongo.getActualCash('buenaventura')),
                portanueva: Math.min(4000, await mongo.getActualCash('portanueva')),
            });
        });

    app.post("/google/user/bookings",
        requiresAdmin,
        async function (req, res) {
            const {email} = req.body
            // const data = await google.getBookings(email)
            res.json([])
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
            if (req.body.test) {
                const emailTemplate = createTemplate("newsLetterEmail", {
                    email: "massi.cattaneo.it@gmail.com",
                    subject: req.body.subject,
                    html: req.body.html,
                })
                return mailer.send(emailTemplate)
            } else {
                const bcc = await mongo.getNewslettersUsers()
                console.log("SENDING NEWSLETTER TO", bcc.length, "USERS")
                await bcc.reduce(async (prev, user) => {
                    await prev
                    await new Promise(res => setTimeout(res, 500))
                    const body = {
                        email: user.email,
                        subject: req.body.subject,
                        html: req.body.html,
                    }
                    return sendCommunication(user._id, "email", "newsLetterEmail", body)
                }, Promise.resolve())
                console.log("NEWSLETTERs SENT")
            }
                res.send("ok")
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
                main: '0201602867',
                secondary: '0201599433'
            };
            const { data, name: account } = req.files.fileUpload;
            const buffer = new Buffer(data);
            const accountNumber = accounts[account];
            const docs = buffer.toString()
                .split('\n')
                .filter(line => line.match(/^\d\d\/\d\d\/\d\d\d\d/))
                .map(function (line) {
                    const arr = line.split(',');
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

    app.get('/api/actual-cash', 
        requiresAdmin,
        async function (req, res) {
            const { user } = req.query;
            const total = await mongo.getActualCash(user);
            res.send({ total })
        })

    app.get('/api/get-bar-codes', 
        requiresAdmin,
        async function (req, res) {
            const barcodes = await mongo.getBarCodes(google.publicDb());
            res.send(barcodes)
        })

    app.delete('/api/upload/:id',
        requiresAdmin,
        async function (req, res) {
            const id = req.params.id;
            const file = await mongo.rest.delete('uploads', id);
            await google.delete(file.googleRef);
            res.send(file);
        });
    
    app.post('/api/bbva/updload',
        requiresAdmin,
        async function (req, res) {
            const files = Array.isArray(req.files.fileUpload)
                ? req.files.fileUpload.map(f => f.data)
                : [req.files.fileUpload.data]
            const summary = { items: [], inserted: 0, skipped: 0 }
            await Promise.all(files.map(async file => {
                const buffer = Buffer.from(file);
                const a = await mongo.insertBBVAMonthExtract(buffer)
                summary.items.push(a.items)
                summary.inserted += a.inserted
                summary.skipped += a.skipped
            }))
            res.send(summary);
        });
    
    app.get('/api/cash/summary',
        requiresSuperAdmin,
        async function (req, res) {
            const data = await mongo.cashSummary()
            res.json(data)
        });
    
    app.get('/api/cash/comparing-summary',
        requiresSuperAdmin,
        async function (req, res) {
            const { from, to } = req.query;
            const start = shared.getSpainDate(Number(from), 0).getTime()
            const end = shared.getSpainDate(Number(to), 23.99999).getTime()
            const data = await mongo.comparingCashSummary(start, end)
            res.json(data)
        });

    app.post('/api/client/error',
        bruteforce.prevent,
        async function (req, res) {
            if (req.headers.origin === "https://www.inandoutbelleza.es") {
                const userId = req.session ? req.session.userId : ""
                mailer.send({
                    to: ["massi.cattaneo.it@gmail.com"], // list of receivers
                    subject: 'Error on the client', // Subject line
                    text: '',
                    userId,
                    html: Object.keys(req.body).map(key => `<p>${key.toUpperCase()}: ${req.body[key]}</p>`)
                })
            }
            res.json({})
        });

    
    const callback = function response(req, res) {
        const isAdmin = req.path.substr(0, 6) === '/admin';
        const isSpider = req.isSpider()
        if (req.headers['x-forwarded-proto'] === 'http' && !isSpider) {
            res.redirect(`https://${req.headers.host}${req.url}`);
        }
        else if (isAdmin) {
            res.sendFile(path.join(__dirname, 'static/admin/index.html'));
        } else {
            if (isSpider) {
                try {
                    if (req.path.endsWith("/")) {
                        res.write(fs.readFileSync(path.join(__dirname, `static/seo${req.path}index.html`), 'utf8'))
                    } else {
                        res.write(fs.readFileSync(path.join(__dirname, `static/seo${req.path}.html`), 'utf8'))
                    }
                } catch (e) {
                    res.write(fs.readFileSync(path.join(__dirname, 'static/seo/index.html'), 'utf8'));
                } finally {
                    res.end();
                }
                return
            }
            res.write(fs.readFileSync(path.join(__dirname, 'static/index.html'), 'utf8'));
            res.end();
            
            
        }
    };
    app.use(express.static(__dirname + '/static', {
        maxage: 365 * 24 * 60 * 60 * 1000,
        etag: false
    }));
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

    

    utils.wss = new WebSocket.Server({ server });

    utils.wss.on('connection', function connection(ws) {
        ws.isAlive = true;
        ws.on('pong', function heartbeat() {
            ws.isAlive = true;
        });
    });

    const intervalCheckWss = setInterval(function ping() {
        utils.wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 5 * 1000);

    utils.wss.on('close', function close() {
        clearInterval(intervalCheckWss);
    });

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
