const fs = require('fs');
const { promiseSerial } = require('../web-app-deploy/pdf/common');
const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const google = require('../web-app-deploy/google-api')({}, []);
const newHours = require('../web-app-deploy/private/new-hours');
const { getSpainOffset } = require('../web-app-deploy/shared');
const oneDayMilliseconds = 24 * 60 * 60 * 1000;
const bcrypt = require('bcrypt');

const devUrl = "mongodb://localhost:27017/in-and-out"

MongoClient.connect(devUrl, async function (err, db) {
    if (err) return;

    const bcc = await mongo.getNewslettersUsers();
    console.log('SENDING NEWSLETTER');
    await bcc.reduce(async (prev, user) => {
        await prev;
        await new Promise(res => setTimeout(res, 500))
        const body = {
            email: user.email,
            subject: req.body.subject,
            html: req.body.html
        }
        return sendCommunication(user._id, "email", "newsLetterEmail", body);
    }, Promise.resolve())
    console.log('NEWSLETTERs SENT');

    console.log("FINISH", list.length)
        
    process.exit();
});
