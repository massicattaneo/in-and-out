const { promiseSerial } = require('./common');

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const path = require('path');
const url = `mongodb://localhost:27017/in-and-out`;
const google = require('../web-app-deploy/google-api')({}, []);

const ImportCsv = require('./import-csv');
const BillSummary = require('./bill-summary');
const CashSummary = require('./cash-summary');
const BankSummary = require('./bank-summary');
const GlobalSummary = require('./global-summary');

MongoClient.connect(url, async function (err, db) {
    if (err) return;

    await google.authorize();
    await google.initDriveSheets();

    // create temp directory
    // ImportCsv(db);
    // /** TRIMESTRAL SUMMARY **/
    // await BankSummary(db, google, {
    //     from: new Date('2018-10-01 00:00:00').getTime(),
    //     to: new Date('2019-01-02 23:59:59').getTime(),
    //     title: 'IV TRIMESTRE 2018'
    // });
    await BillSummary(db, google, {
        title: 'IV TRIMESTRE 2018'
    });
    // await CashSummary(db, google, {
    //     from: new Date('2018-10-01 00:00:00').getTime(),
    //     to: new Date('2018-12-31 23:59:59').getTime(),
    //     maxCashAmount: 2650
    // });
    // await GlobalSummary(db, google, {
    //     from: new Date('2018-10-01 00:00:00').getTime(),
    //     to: new Date('2018-12-31 23:59:59').getTime()
    // });

    console.log('finish');
});

