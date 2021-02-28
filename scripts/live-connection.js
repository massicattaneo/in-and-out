const fs = require('fs');
const { promiseSerial } = require('../web-app-deploy/pdf/common');
const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const config = access.config;
const ObjectId = require('mongodb').ObjectID;
const url = `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;
const CashSummary = require('../web-app-deploy/excel/cash-summary');
const google = require('../web-app-deploy/google-api')({}, []);
const newHours = require('../web-app-deploy/private/new-hours');
const { getSpainOffset } = require('../web-app-deploy/shared');
const oneDayMilliseconds = 24 * 60 * 60 * 1000;
MongoClient.connect(url, async function (err, db) {
    if (err) return;

    await google.authorize();
    await google.initDriveSheets();

    // CHANGE CALENDAR DATE
    // const date = new Date(2020, 8, 1, 8);
    // const until = new Date(2020, 9, 1, 12);
    // while (date.getTime() < until.getTime()) {
    //     console.warn('PROCESSING DATE:', date);
    //     await newHours.workers
    //         .filter(({ column }) => column !== 'wendy')
    //         .reduce(async (prev, { googleId, column }) => {
    //             await prev;
    //             const offset = getSpainOffset(date);
    //             await google
    //                 .calendarGet(googleId, date)
    //                 .then(async (response) => {
    //                     for (let index = 0; index < response.items.length; index++) {
    //                         const { start, end, id, summary, location, description, extendedProperties } = response.items[index];
    //                         const startDate = new Date(start.dateTime);
    //                         const endDate = new Date(end.dateTime);
    //                         startDate.setTime(startDate.getTime() - offset * 60 * 60 * 1000);
    //                         endDate.setTime(endDate.getTime() - offset * 60 * 60 * 1000);
    //                         if (extendedProperties.private.fixedHour) {
    //                             console.warn('SKIPPED AS IT WAS PARSED BEFORE');
    //                             return Promise.resolve();
    //                         } else {
    //                             // console.warn('CHANGING HOUR', column, response.items[index])
    //                         }
    //                         extendedProperties.private.fixedHour = true;
    //                         await google.calendarUpdateTime({
    //                             id: googleId,
    //                             from: startDate,
    //                             to: endDate,
    //                             eventId: id,
    //                             summary,
    //                             location,
    //                             description,
    //                             extendedProperties
    //                         }).catch(err => {
    //                             console.warn(err);
    //                             process.exit();
    //                         });
    //                     }
    //
    //                 });
    //         }, Promise.resolve());
    //     date.setTime(date.getTime() + oneDayMilliseconds);
    // }


    // LOGOUT ALL ADMIN USERS
    // const items = (await db.collection('sessions').find().toArray());
    // items.forEach(item => {
    //     const session = JSON.parse(item.session);
    //     if (session.isAdmin === true) {
    //         db.collection('sessions').deleteOne({ _id: item._id, })
    //         console.warn(item)
    //     }
    // });

    // db.collection('centers').insertOne({
    //     id: 'salitre',
    //     name: 'In&Out Calle Salitre',
    //     billRef: '14',
    //     lastBillNumber: 15721,
    //     'color': '#cdfaff',
    //     'index': 0,
    //     'label': 'SALITRE',
    //     'address': 'CALLE SALITRE, 11 - MÁLAGA',
    //     'tel': '951 131 460',
    //     'mobile': '633 90 91 03',
    //     closed: false
    // });
    // db.collection('centers').insertOne({
    //     id: 'compania',
    //     name: 'In&Out Calle Compañia',
    //     billRef: '15',
    //     lastBillNumber: 2006,
    //     'color': '#cdffd6',
    //     'index': 1,
    //     'label': 'COMPAÑIA',
    //     'address': 'CALLE COMPANIA, 42 - MÁLAGA',
    //     'tel': '951 387 919',
    //     'mobile': '695 685 291',
    //     closed: true
    // });
    // db.collection('centers').insertOne({
    //     id: 'buenaventura',
    //     name: 'In&Out Calle Buenaventura',
    //     billRef: '16',
    //     lastBillNumber: 2137,
    //     'color': '#ffcdcd',
    //     'index': 2,
    //     'label': 'BUENAVENTURA',
    //     'address': 'CALLE PUERTA DE BUENAVENTURA, 4 - MÁLAGA',
    //     'tel': '951 387 919',
    //     'mobile': '695 685 291',
    //     closed: false
    // });
    // db.collection('centers').insertOne({
    //     id: 'online',
    //     name: 'In&Out Tienda Online',
    //     billRef: '17',
    //     lastBillNumber: 206,
    //     'color': '#cdfaff',
    //     'index': 3,
    //     'label': 'ONLINE',
    //     'address': '',
    //     'tel': '',
    //     'mobile': '',
    //     closed: false
    // });

    /** DUPLICATE PHONE */
    // const list = [];
    // db.collection('users').aggregate(
    //     { '$group': { '_id': '$tel', 'count': { '$sum': 1 } } },
    //     { '$match': { '_id': { '$ne': null }, 'count': { '$gt': 1 } } },
    //     { '$project': { 'tel': '$_id', '_id': 0 } }
    // ).forEach(async function (doc) {
    //     db.collection('users').find({tel: doc._id}).toArray(function (e, docs) {
    //         list.push(docs)
    //     })
    // });
    // setTimeout(function () {
    //     fs.writeFileSync('./scripts/temp.json', JSON.stringify(list));
    //     console.log('finish');
    // }, 5000);

    /** LOWERCASE EMAILS */
    // db.collection('users').find( {}, { 'email': 1 } ).forEach(function(doc) {
    //     db.collection('users').update(
    //         { _id: doc._id},
    //         { $set : { 'email' : doc.email.toLowerCase() } }
    //     );
    //     console.log(doc.email)
    // });

    // /** MERGE CLIENTS */
    // const oldClient = '5aef7fcbf28e19001f9f19dd';
    // const newClient = '5b196493b0e50e001f5afa6b';
    // db.collection('bonus').find({ clientId: ObjectId(oldClient) }).forEach(function (doc) {
    //     db.collection('bonus').update(
    //         { _id: doc._id },
    //         { $set: { clientId: ObjectId(newClient) } }
    //     );
    //     console.log(doc);
    // });
    // db.collection('cash').find({ clientId: ObjectId(oldClient) }).forEach(function (doc) {
    //     db.collection('cash').update(
    //         { _id: doc._id },
    //         { $set: { clientId: ObjectId(newClient) } }
    //     );
    //     console.log(doc);
    // });
    //
    // /** missing merging emails */
    // db.collection('users').find({ _id: ObjectId(oldClient) }).forEach(function (doc) {
    //     db.collection('users').updateOne(
    //         { _id: ObjectId(newClient) },
    //         {
    //             $set: {
    //                 fb_id: doc.fb_id,
    //                 fb_cardId: doc.fb_cardId
    //             }
    //         }
    //     );
    //     console.log(doc);
    // });

    /** CSV OF NO ACTIVE USERS */
    // db.collection('users').find({ active: false }).toArray(function (err, users) {
    //     if (err) return console.log('error');
    //     fs.writeFileSync('./scripts/temp.csv', users.map(doc => `${doc.name},${doc.email},${doc.tel}`).join('\n'));
    //     console.log('finish');
    // });

    /** mark bills as deducted from IVA **/
    // const bills = await db.collection('bills').find().toArray();
    // await promiseSerial(bills.map(bill => function () {
    //     return new Promise(resolve => {
    //         db.collection('bills').updateOne(
    //             { _id: ObjectId(bill._id) },
    //             { $set: { deducted: true } }
    //             , resolve);
    //     });
    // }));

    /** save cash billNumber */
    // const from = new Date('2020-10-01:00:00');
    // const to = new Date('2020-12-31:23:00');
    // const { report } = await CashSummary(db, google, {
    //     from: from.getTime(),
    //     to: to.getTime(),
    //     maxCashAmount: 2300,
    //     saveBillNumbers: true
    // });

    console.log('finish');
    process.exit();
});
