const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const config = access.config;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const url = `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;

MongoClient.connect(url, function (err, db) {
    if (err) return;

    /** LOWERCASE EMAILS */
    // db.collection('users').find( {}, { 'email': 1 } ).forEach(function(doc) {
    //     db.collection('users').update(
    //         { _id: doc._id},
    //         { $set : { 'email' : doc.email.toLowerCase() } }
    //     );
    //     console.log(doc.email)
    // });

    /** MERGE CLIENTS */
    // const oldClient = '5b55e6c98556f5001f316cc6';
    // const newClient = '5b7fe7f703c35a001fa3d399';
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

    // /** CSV OF NO ACTIVE USERS */
    // db.collection('users').find({ active: false }).toArray(function (err, users) {
    //     if (err) return console.log('error');
    //     fs.writeFileSync('./db-scripts/temp.csv', users.map(doc => `${doc.name},${doc.email},${doc.tel}`).join('\n'));
    //     console.log('finish');
    // });

});