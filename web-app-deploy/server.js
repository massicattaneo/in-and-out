const { firebaseBonuses, firebaseClients, firebaseTransactions } = require("./firebaseImporter");

const path = require('path');
const utils = {};
const express = require('express');
const port = process.env.PORT || 8090;
const app = express();
const google = require("./google-api")(utils);
const mailer = require("./mailer/mailer")();
const isDeveloping = process.env.NODE_ENV === "development";
const mongo = require("./mongo")(isDeveloping, utils);
const bodyParser = require('body-parser');
const ExpressBrute = require('express-brute');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const LoginServices = require('./login-services');
const fs = require('fs');
const compression = require('compression');
const stripe = require('./stripe')();
const createTemplate = require('./mailer/createTemplate');
const QRCode = require('qrcode');
const googleDb = require('./private/inandout-b97ef85c65d6.json');
const ObjectId = require('mongodb').ObjectID;
const createPdfOrder = require('./pdf/createPdfOrder');
const https = require('https');
const http = require('http');
const urlParse = require('url');
const WebSocket = require('ws');
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};
const adminKeys = require('./private/adminKeys');

(async function() {
    const { store, db } = await mongo.connect();
    const bruteforce = new ExpressBrute(store);

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

    function requiresAdmin(req, res, next) {
        if (req.session && req.session.isAdmin) {
            return next();
        } else {
            req.session.destroy(function(err) {
                if (err) {
                    res.status(500);
                    return res.send('error');
                } else {
                    res.status(500);
                    return res.send('anonymous');
                }
            });
        }
    }

    function requiresLogin(req, res, next) {
        if (req.session && req.session.userId) {
            return next();
        } else {
            req.session.destroy(function(err) {
                if (err) {
                    res.status(500);
                    return res.send('error');
                } else {
                    res.status(500);
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

    app.get('/google/drive/*', function(req, res) {
        const file = __dirname + decodeURI(urlParse.parse(req.url).pathname);
        if (fs.existsSync(file)) {
            const s = fs.createReadStream(file);
            res.set('Content-Type', 'image/jpg');
            s.pipe(res);
        } else {
            // res.error(404);
            res.send('');
        }
    });

    app.get('/api/public-db', async function(req, res) {
        res.send(Object.assign({}, google.publicDb(), { reviews: await mongo.getReviewsInfo() }));
    });

    app.get('/api/reviews/*', function(req, res) {
        const start = Number(req.url.substr(req.url.lastIndexOf('/') + 1)) * 3;
        mongo.reviewsList()
            .then(function(list) {
                res.send(list.splice(start, 3))
            })
            .catch(function(err) {
                res.error(500);
                res.send(err.message);
            })
    });

    app.post('/api/treatments/favourite',
        requiresLogin,
        function(req, res) {
            mongo.favouriteTreatment({
                treatmentId: req.body.id,
                value: req.body.value,
                userId: req.session.userId
            }).then(function() {
                res.send('ok')
            })
        });

    app.post('/api/reviews',
        requiresLogin,
        function(req, res) {
            mongo.insertReview({
                rate: req.body.rate,
                lang: req.body.lang,
                description: req.body.description,
                userId: req.session.userId,
            })
                .then(function(review) {
                    res.send(review)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.post('/google/free-busy',
        requiresLogin,
        function(req, res) {
            google
                .freeBusy(req.body)
                .then(function(review) {
                    res.send(review)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.post('/api/stripe/pay',
        async function(req, res) {
            const { token, cart, email } = req.body;
            const pos = { 'TAR': 'bonusCards', 'TRT': 'treatments' };
            const amount = cart
                .map(id => {
                    return google.publicDb()[pos[id.substr(0, 3)]].filter(c => c.identificador === id)[0];
                })
                .reduce((tot, { precio }) => tot + Number(precio), 0) * 100;
            const { id } = await mongo.buy({ cart, userId: req.session.userId, email, amount });
            stripe.pay({ token, amount, orderId: id, cart, email })
                .then(async function(stripeRes) {
                    await mongo.confirmBuy({
                        id,
                        stripeId: stripeRes.id,
                        amount: stripeRes.amount,
                        last4: stripeRes.source.last4
                    });
                    const emailParams = {
                        id,
                        email,
                        amount: stripeRes.amount,
                        cart,
                        googleDb: google.publicDb()
                    };
                    mailer.send(createTemplate('orderConfirmedEmail', emailParams));
                    delete emailParams.googleDb;
                    await res.send(emailParams);
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.get('/api/pdf/*',
        async function(req, res) {
            const orderId = req.url.substr(req.url.lastIndexOf('/') + 1);
            const { cart } = await mongo.getOrderInfo(orderId);
            createPdfOrder(res, google.publicDb(), orderId, cart);
        });

    app.post('/google/calendar/insert',
        requiresLogin,
        async function(req, res) {
            const { treatments, start, locationIndex } = req.body;
            const { name, tel, email } = await mongo.getUser({ _id: new ObjectId(req.session.userId) });
            const from = new Date(start);
            let calIndex = -1, busy = [1];
            while (calIndex < googleDb.calendars.length - 1 && busy.length > 0) {
                const treatmentsDuration = google.getTreatmentsDuration(treatments, ++calIndex, locationIndex, start);
                if (treatmentsDuration > 0) {
                    const to = new Date(from.getTime() + treatmentsDuration);
                    const r = await google.freeBusy({
                        timestamp: start,
                        calendars: [calIndex],
                        timeFrame: { from, to }
                    });
                    busy = r[googleDb.calendars[calIndex].worker];
                    if (busy.length === 0) break;
                }
            }
            if (busy.length === 0) {
                const label = google.getTreatmentsLabel(treatments);
                const duration = google.getTreatmentsDuration(treatments, calIndex, locationIndex, from.toISOString());
                google.calendarInsert({
                    id: googleDb.calendars[calIndex].id,
                    from: from.toISOString(),
                    to: new Date(from.getTime() + duration).toISOString(),
                    summary: `${name} (TEL. ${tel}) ${label}`,
                    description: email,
                    label
                }).then((e) => {
                    res.send(e);
                })
                    .catch(() => {
                        res.error(500);
                        res.send('error');
                    })
            } else {
                res.error(500);
                res.send('error');
            }
        });

    app.post('/google/calendar/delete',
        requiresLogin,
        async function(req, res) {
            const { eventId, calendarId } = req.body;
            google
                .calendarDelete({ eventId, calendarId })
                .then(() => {
                    res.send('ok');
                })
                .catch(() => {
                    res.error(500);
                    res.send('error');
                })
        });

    app.post('/google/calendar/get',
        requiresAdmin,
        async function(req, res) {
            const { timestamp, calendarId } = req.body;
            google
                .calendarGet(calendarId, new Date(timestamp))
                .then((r) => {
                    res.send(r);
                })
                .catch((e) => {
                    res.error(500);
                    res.send('error');
                })
        });

    app.post('/google/calendar/add',
        requiresAdmin,
        async function(req, res) {
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
                    res.error(500);
                    res.send('error');
                })
        });


    app.get(
        '/api/qr-code/*',
        async function(req, res) {
            const order = req.url.substr(req.url.lastIndexOf('/') + 1);
            await QRCode.toFile(`${__dirname}/order-qr-codes/${order}.png`, `${order}`);
            const stream = fs.createReadStream(`${__dirname}/order-qr-codes/${order}.png`);
            stream.pipe(res);
            stream.on('data', data => res.write(data, 'binary'));
            stream.on('end', () => res.end());
        });

    app.get('/api/adminDb',
        requiresAdmin,
        async function(req, res) {
            res.send({
                clients: await mongo.getAll('users'),
                orders: await mongo.getAll('orders')
            });
        });

    app.get('/api/rest/*',
        requiresAdmin,
        async function(req, res) {
            const path = decodeURI(req.url).substr(10, 1000000).split('?');
            mongo.rest.get(path[0], path[1])
                .then(function(cash) {
                    res.send(cash)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.get('/sitemap.xml', function(req, res) {
        google.createSitemap().toXML( function (err, xml) {
            if (err) {
                return res.status(500).end();
            }
            res.header('Content-Type', 'application/xml');
            res.send( xml );
        });
    });

    app.post('/api/rest/*',
        requiresAdmin,
        async function(req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 1];
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            mongo.rest.insert(table, Object.assign(req.body, { ip }))
                .then(function(cash) {
                    res.send(cash)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.put('/api/rest/*',
        requiresAdmin,
        async function(req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 2];
            const id = paths[paths.length - 1];
            mongo.rest.update(table, id, req.body)
                .then(function(cash) {
                    res.send(cash)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.delete('/api/rest/*',
        requiresAdmin,
        async function(req, res) {
            const paths = req.url.split('/');
            const table = paths[paths.length - 2];
            const id = paths[paths.length - 1];
            mongo.rest.delete(table, id)
                .then(function(cash) {
                    res.send(cash)
                })
                .catch(function(err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    let callback;
    if (isDeveloping) {
        callback = require('../webpack/dev-server')(app, express);
    } else {
        app.use(express.static(__dirname + '/static', {
            maxage: 365 * 24 * 60 * 60 * 1000,
            etag: false
        }));
        callback = function response(req, res) {
            const isAdmin = urlParse.parse(req.url).pathname.substr(0, 6) === '/admin';

            res.sendFile(path.join(__dirname, `static/${isAdmin ? 'admin' : 'index'}.html`));
        };
    }
    app.get('*', callback);


    const server = http.createServer(app).listen(port, () => {
        console.log('http server running at ' + port)
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

    console.log('finish');
})();
