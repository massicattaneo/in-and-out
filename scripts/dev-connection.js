const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const url = `mongodb://localhost:27017/in-and-out`;
const path = require('path');
const ImportCsv = require('./import-csv');

MongoClient.connect(url, function (err, db) {
    if (err) return;

    ImportCsv(db);

});

