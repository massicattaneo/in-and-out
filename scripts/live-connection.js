const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const config = access.config;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const url = `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;
const path = require('path');
const CashSummary = require('./cash-summary');
const BillSummary = require('./bill-summary');
const BankSummary = require('./bank-summary');
const GlobalSummary = require('./global-summary');
const ImportCsv = require('./import-csv');

const google = require('../web-app-deploy/google-api')({}, []);

function convertNumber(s) {
    const string = s.toString();
    if (string.indexOf(',') !== -1 && string.indexOf('.') !== -1) {
        if (string.indexOf(',') >= string.indexOf('.')) return Number(string.replace('.', '').replace(',', '.'));
        if (string.indexOf('.') >= string.indexOf(',')) return Number(string.replace(/[^0-9\.-]+/g, ''));
    } else if (string.indexOf(',') !== -1) {
        return Number(string.replace(',', '.'));
    }
    return Number(string);
}

MongoClient.connect(url, async function (err, db) {
    if (err) return;

    await google.authorize();
    await google.initDriveSheets();

    /** GLOBAL SUMMARY */
    // await BillSummary(db, google, {});

    /** TRIMESTRAL SUMMARY **/
    // await BankSummary(db, google, {
    //     from: new Date('2018-07-01 02:00:00').getTime(),
    //     to: new Date('2018-09-30 21:59:59').getTime()
    // });
    // await BillSummary(db, google, {
    //     from: new Date('2018-07-01 02:00:00').getTime(),
    //     to: new Date('2018-09-30 21:59:59').getTime()
    // });
    // await CashSummary(db, google, {
    //     from: new Date('2018-07-01 02:00:00').getTime(),
    //     to: new Date('2018-09-30 21:59:59').getTime(),
    //     maxCashAmount: 3200
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

    console.log('finish');

});
