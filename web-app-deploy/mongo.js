const access = require('./private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const MongoStore = require('express-brute-mongo');
let text = process.env.APP_CONFIG || JSON.stringify(access.config);
const config = JSON.parse(text);
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

function getObjectId(id) {
    try {
        return new ObjectID(id);
    } catch (e) {
        return e;
    }
}

function clean(o) {
    return Object.keys(o).reduce(function (ret, key) {
        ret[key] = o[key];
        if (typeof ret[key] === 'string') {
            ret[key] = o[key].trim();
        }
        if (key.indexOf('Id') !== -1 && o[key] !== '' && o[key].length <= 40) {
            try {
                ret[key] = getObjectId(o[key]);
            } catch (e) {
                ret[key] = o[key];
            }
        }
        return ret;
    }, {});
}

module.exports = function (isDeveloping, utils) {
    const obj = {};
    const url = isDeveloping ? `mongodb://localhost:27017/in-and-out` : `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;
    let db;

    obj.connect = function () {
        return new Promise(function (res, rej) {
            const store = new MongoStore(function (ready) {
                MongoClient.connect(url, function (err, DB) {
                    if (err) {
                        rej(new Error('dbError'));
                    } else {
                        db = DB;
                        ready(db.collection('bruteforce-store'));
                        res({ store, db });
                    }
                });
            });
        });
    };

    obj.insertUser = function ({ email, password, surname = '', tel = '', name, lang, user = 'online', privacy = true }) {
        return new Promise(function (resolve, rej) {
            db.collection('users').find({ email }).toArray(function (err, result) {
                if (err) return rej(new Error('generic'));
                if (result.length) return rej(new Error('existingUser'));
                const activationCode = bcrypt.hashSync(password, 4);
                const hash = bcrypt.hashSync(password, 10);
                const created = Date.now();
                const insert = {
                    created, hash, surname, activationCode, name, tel, privacy,
                    email: email.toLowerCase(), active: false, lang, user
                };
                db.collection('users').insertOne(insert, function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        Object.assign(insert, { id: res.insertedId });
                        utils.wss.broadcast(JSON.stringify({
                            type: 'insertUser',
                            data: Object.assign({ id: res.insertedId }, insert)
                        }));
                        resolve(insert);
                    }
                });
            });
        });
    };

    obj.activateUser = function (activationCode) {
        return new Promise(function (res, rej) {
            db
                .collection('users')
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { active: true } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return rej(new Error('generic'));
                        if (r.value === null) return rej(new Error('generic'));
                        res(r.value);
                    });
        });
    };

    obj.getEmails = function () {
        return new Promise(function (resolve, reject) {
            db.collection('users')
                .find({ email: { $exists: true, $not: { $size: 0 } }, deleted: { $exists: false } })
                .toArray(function (err, res) {
                    resolve(res.filter(i => i.active !== false).filter(i => i.deleted !== true).map(i => i.email));
                });
        });
    };

    obj.getUser = function (data) {
        return new Promise(function (resolve, reject) {
            db.collection('users')
                .findOne(data, function (err, user) {
                    if (err) return reject(new Error('generic'));
                    if (!user) return resolve({ anonymous: true });
                    resolve(user);
                });
        });
    };

    obj.getAll = function (collectionName) {
        return new Promise(function (resolve, reject) {
            db.collection(collectionName).find().toArray(function (err, data) {
                if (err) return reject(new Error('generic'));
                resolve(data);
            });
        });
    };

    obj.recoverPassword = function (data) {
        return new Promise(function (resolve, reject) {
            db
                .collection('users')
                .findOneAndUpdate(
                    data,
                    { $set: { activationCode: bcrypt.hashSync('re$eTPas$W0Rd', 4) } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        });
    };

    obj.resetPassword = function ({ activationCode, password }) {
        return new Promise(function (resolve, reject) {
            db
                .collection('users')
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { hash: bcrypt.hashSync(password, 10), active: true } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        });
    };

    obj.privacyAccept = function ({ activationCode }) {
        return new Promise(function (resolve, reject) {
            db
                .collection('users')
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { privacy: true } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        });
    };

    obj.deleteUser = function ({ userId, password }) {
        return new Promise(async function (resolve, reject) {
            const { email, hash } = await obj.getUser({ _id: getObjectId(userId) });
            if (!email) return reject(new Error('missingUser'));
            bcrypt.compare(password, hash, function (err, res) {
                if (err) return reject(new Error('generic'));
                if (!res) return reject(new Error('wrongPassword'));
                db
                    .collection('users')
                    .findOneAndUpdate(
                        { email },
                        { $set: { deleted: true, _email: email, email: '' } },
                        { returnOriginal: false },
                        function (err, r) {
                            if (err) return reject(new Error('generic'));
                            if (r.value === null) return reject(new Error('missingUser'));
                            utils.wss.broadcast(JSON.stringify({ type: 'deleteUser', data: r.value }));
                            resolve(r.value);
                        });
            });
        });
    };

    obj.loginUser = function ({ email, password }) {
        return new Promise(function (resolve, rej) {
            db
                .collection('users')
                .findOne({ email }, function (err, user) {
                    if (err) return rej(new Error('generic'));
                    if (!user) return rej(new Error('wrongEmail'));
                    if (!user.active) return rej(new Error('inactiveUser'));
                    bcrypt.compare(password, user.hash, function (err, res) {
                        if (err) return rej(new Error('generic'));
                        if (!res) return rej(new Error('wrongPassword'));
                        resolve(user);
                    });
                });
        });
    };

    obj.reviewsList = function () {
        return new Promise(function (resolve, reject) {
            db.collection('reviews').find({}, { limit: 100 }).sort({ created: -1 }).toArray(function (err, res) {
                resolve(res);
            });
        });
    };

    obj.insertReview = function ({ rate, description, userId, lang }) {
        return new Promise(async function (resolve, rej) {
            const { name } = await obj.getUser({ _id: getObjectId(userId) }).catch(rej);
            db.collection('reviews').insertOne({
                name,
                rate,
                description,
                created: Date.now(),
                userId,
                lang
            }, function (err, res) {
                if (err)
                    rej(new Error('dbError'));
                else {
                    resolve(res.ops[0]);
                }
            });
        });
    };

    obj.favouriteTreatment = function ({ treatmentId, value, userId }) {
        db.collection('favourites').update({ treatmentId, userId }, { treatmentId, userId, value }, { upsert: true });
        return Promise.resolve();
    };

    obj.getUserData = function (userId) {
        return new Promise(function (resolve, reject) {
            db.collection('favourites').find({ userId, value: true }).toArray(function (err, res) {
                resolve(res.map(i => i.treatmentId));
            });
        });
    };

    obj.buy = function ({ cart = [], userId, amount, email, sendTo }) {
        return new Promise(function (resolve, reject) {
            const doc = {
                userId, sendTo, cart, email, amount, payed: false, created: (new Date()).toISOString()
            };
            db.collection('orders').insertOne(doc, function (err, res) {
                if (err)
                    reject(new Error('dbError'));
                else {
                    Object.assign(doc, { id: res.insertedId });
                    resolve(doc);
                }
            });
        });
    };

    obj.confirmBuy = function ({ id, stripeId, amount, last4 }) {
        return new Promise(function (resolve, reject) {
            db
                .collection('orders')
                .findOneAndUpdate(
                    { _id: id },
                    { $set: { payed: true, stripeId, amount, last4 } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingOrder'));
                        utils.wss.broadcast(JSON.stringify({ type: 'insert-rest-orders', data: r.value }));
                        resolve(r.value);
                    });
        });
    };

    obj.getReviewsInfo = function () {
        const col = db.collection('reviews');
        return Promise.all([
            new Promise(async function (resolve, reject) {
                col.aggregate([{ $count: 'count' }]).toArray(function (err, docs) {
                    if (err) return reject(new Error('generic'));
                    resolve(docs);
                });
            }),
            new Promise(async function (resolve, reject) {
                col.aggregate([{ $group: { _id: null, average: { $avg: '$rate' } } }]).toArray(function (err, docs) {
                    if (err) return reject(new Error('generic'));
                    resolve(docs);
                });
            })
        ]).then(function (array) {
            return {
                count: array && array[0].length ? array[0][0].count : [],
                average: array && array[1].length ? array[1][0].average : 0
            };
        });
    };

    obj.getOrderInfo = function (id) {
        return new Promise(function (resolve, reject) {
            db.collection('orders')
                .findOne({ _id: getObjectId(id) }, function (err, order) {
                    if (err) return reject(new Error('generic'));
                    if (!order) return reject(new Error('generic'));
                    resolve(order);
                });
        });
    };

    obj.rest = {
        get: function (table, filter = '') {
            const find = {};
            const filters = filter.split('&');
            filters.forEach(f => {
                if (f.indexOf('>') !== -1) {
                    const tmp = f.split('>');
                    find[tmp[0]] = find[tmp[0]] || {};
                    find[tmp[0]]['$gt'] = Number(tmp[1]);
                }
                if (f.indexOf('<') !== -1) {
                    const tmp = f.split('<');
                    find[tmp[0]] = find[tmp[0]] || {};
                    find[tmp[0]]['$lt'] = Number(tmp[1]);
                }
                if (f.indexOf('=') !== -1) {
                    const tmp = f.split('=');
                    if (tmp[0].toLowerCase().indexOf('id') !== -1) {
                        try {
                            find[tmp[0]] = getObjectId(tmp[1]);
                        } catch (e) {
                            find[tmp[0]] = tmp[1];
                        }
                    } else {
                        find[tmp[0]] = tmp[1];
                    }
                }
            });
            return new Promise(async function (resolve, rej) {
                db.collection(table).find(find).toArray(function (err, result) {
                    if (err) return rej(new Error('generic'));
                    resolve(result);
                });
            });
        },
        insert: function (table, body) {
            return new Promise(async function (resolve, rej) {
                db.collection(table).insertOne(clean(body), function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        const data = Object.assign({ _id: res.insertedId }, body);
                        const type = `insert-rest-${table}`;
                        utils.wss.broadcast(JSON.stringify({ type, data }));
                        resolve(data);
                    }
                });
            });
        },
        update: function (table, id, body) {
            return new Promise(async function (resolve, rej) {
                db
                    .collection(table)
                    .findOneAndUpdate(
                        { _id: getObjectId(id) },
                        { $set: clean(body) },
                        { returnOriginal: false },
                        function (err, r) {
                            if (err) return rej(new Error('generic'));
                            if (r.value === null) return rej(new Error('generic'));
                            const type = `update-rest-${table}`;
                            utils.wss.broadcast(JSON.stringify({ type, data: r.value }));
                            resolve(r.value);
                        });
            });
        },
        delete: function (table, id) {
            return new Promise(async function (resolve, rej) {
                const item = await obj.rest.get(table, `_id=${id}`);
                db.collection(table).remove({ _id: getObjectId(id) }, function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        const type = `delete-rest-${table}`;
                        utils.wss.broadcast(JSON.stringify({ type, data: item[0] }));
                        resolve(item[0]);
                    }
                });
            });
        }
    };

    return obj;
};
