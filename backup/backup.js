var access = require('../web-app-deploy/private/mongo-db-access');
var backup = require('mongodb-backup');
var devUri = `mongodb://localhost:27017/in-and-out`;
var prodUri = `mongodb://${access.config.mongo.user}:${encodeURIComponent(access.password)}@${access.config.mongo.hostString}`;

backup({
    uri: prodUri,
    root: __dirname
});