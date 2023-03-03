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

    // await google.authorize();
    // await google.initDriveSheets();

    // const list = await (await db.collection('cash').find().toArray())
    
    // GENERATE CENTERS TABLE
    // await Promise.all(newHours.centers.map(async center => {
    //     await db.collection('centers').insertOne({
    //         lastBillNumber: 0,
    //         ...center,
    //     });
    // }))

    // POINT 0 LOGOUT ALL ADMIN USERS
    // const list = (await db.collection('sessions').find({ session: { $regex: '"isAdmin":true' } }).toArray())
    // await Promise.all(list.map(item => db.collection('sessions').deleteOne({ _id: item._id, })));

    // POINT 1 lowercase all users emails
    // const list = await (await db.collection('users').find({}).toArray())
    // await promiseSerial(list.map(user => async function () {
    //     await db.collection('users').updateOne({ _id: ObjectId(user._id) }, { $set: { email: user.email.toLowerCase() }});
    // }));
    
    // POINT 2. lowercase all orders emails
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { email: order.email.toLowerCase() }});
    // }));
      
    // POINT 3. update wrong orders userId
    // const list = await (await db.collection('orders').find({}).toArray())
    // const [order] = list.filter(i => i.userId === "salitre")
    // if (order) await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: null }});
    
    // POINT 4. update wrong orders userId
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     if (!order.userId) return
    //     const [user] = await db.collection('users').find({ _id: ObjectId(order.userId) }).toArray()
    //     if (!user) {
    //         const [emailUser] = await db.collection('users').find({ email: order.email }).toArray()
    //         await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: emailUser._id }});
    //     }
    // }));

    // POINT 5. add a number date (timestamp) for all orders (for filtering on the admin app cash summary)
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     const timestamp = new Date(order.created).getTime()
    //     await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { timestamp }});
    // }));

    // POINT 6. Create a client for each order user that do not have it
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     if (!order.payed) return
    //     if (order.userId) {
    //         const [userFromId] = await db.collection('users').find({ _id: ObjectId(order.userId) }).toArray()
    //         if (userFromId) return
    //     }
    //     const [userFromEmail] = await db.collection('users').find({ email: order.email }).toArray()
    //     if (userFromEmail) {
    //         await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: userFromEmail._id }});
    //     } else {
    //         const password = (Math.floor(100000 + Math.random() * 900000)).toString();
    //         const [name = ""] = order.email.split("@")
    //         const user = {
    //             created: order.timestamp,
    //             hash: bcrypt.hashSync(password, 10),
    //             surname: "",
    //             activationCode: bcrypt.hashSync(password, 4),
    //             name,
    //             tel: "",
    //             privacy: true,
    //             newsletter: false,
    //             email: order.email.toLowerCase(),
    //             active: true,
    //             lang: "es",
    //             user: "online",
    //         }
    //         await db.collection('users').insertOne(user);
    //         const [newUser] = await db.collection('users').find({ email: user.email }).toArray()
    //         await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: newUser._id }});
    //     }
    // }));

    

    // POINT 7. add a cash "online" input in the cash table for each online order and add his relative bill-number with the clientId
    // const endOf2022Timestamp = new Date("2022-12-31T23:59:59").getTime()
    // const list = await (await db.collection('orders').find({}).toArray())
    // function padLeft(string, size, char) {
    //     if (size === 0) return '';
    //     return (Array(size + 1).join(char) + string).slice(-size);
    // }
    // await promiseSerial(list
    //     .filter(order => order.payed)
    //     .filter((_, index) => index > 236) // for having corrent bill numbers 2023
    //     .map((order, index) => async function () {
    //         const [user] = await db.collection('users').find({ _id: ObjectId(order.userId) }).toArray()
    //         const billNumber = `17${padLeft((index + 1).toString(), 6, '0')}`
    //         if (!user) {
    //             console.log("SHOULD NOT HAPPEN!", order.email, order.userId)
    //         } else if (order.timestamp < endOf2022Timestamp) {
    //             const cash = {
    //                 clientId: order.userId,
    //                 date: order.timestamp,
    //                 description: 'Compra online',
    //                 type: 'stripe',
    //                 user: 'online',
    //                 amount: order.amount / 100,
    //                 orderId: order._id,
    //                 billNumber,
    //             }
    //             await db.collection('cash').insertOne(cash);
    //         } else {
    //             const cash = {
    //                 clientId: order.userId,
    //                 date: order.timestamp,
    //                 description: 'Compra online',
    //                 type: 'stripe',
    //                 user: 'online',
    //                 amount: order.amount / 100,
    //                 orderId: order._id,
    //             }
    //             await db.collection('cash').insertOne(cash);
    //         }
    // }));
    
    // POINT 8. convert client emails fields to "communications" table
    // const list = (await (await db.collection('users').find({}).toArray()))
    //     .filter(item => item.emails)
    // await promiseSerial(list.map(user => async () => {
    //     await promiseSerial(user.emails.map(email => async () => {
    //         const com = {
    //             type: "email",
    //             action: "googleReview",
    //             data: { name: user.name, email: user.email, centerIndex: email.centerIndex },
    //             clientId: user._id,
    //             date: new Date(email.sent).getTime(),
    //             sent: true
    //         }
    //         await db.collection('communications').insertOne(com);
    //         await db.collection('users').updateOne({ _id: ObjectId(user._id) }, { $unset: { emails: "" } });
    //     }));
    // }));

    // POINT 9. convert the itemKey in cash to cart
    // const list = (await (await db.collection('cash').find({ itemKey: { $exists: true } }).toArray()))
    // await promiseSerial(list.map(cash => async () => {
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { cart: [cash.itemKey] } });
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $unset: { itemKey: "" } });
    // }));

    //POINT 10: add cart to all cash
    // const list = (await (await db.collection('cash').find({ cart: { $exists: false } }).toArray()))
    // await promiseSerial(list.map(cash => async () => {
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { cart: [] } });
    // }));
        
    //POINT 11: Update null cash dates
    // const list = (await (await db.collection('cash').find({  }).toArray()))
    // const nullDateCash = list.filter(item => Number(item.date) !== item.date)
    // await promiseSerial(nullDateCash.map(cash => async () => {
    //     console.log("TEST BEFORE RUNNING!")
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { date: 1499086800000 } });
    // }));

    // POINT 12: remove user null in cash
    // const list = (await (await db.collection('cash').find({  }).toArray())).filter(item => !item.user)
    // await promiseSerial(list.map(cash => async () => {
    //     console.log("TEST BEFORE RUNNING!")
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { user: "salitre" } });
    // }));
    
    // POINT 13: remove user "null" in cash
    // const list = (await (await db.collection('cash').find({  }).toArray())).filter(item => item.user === "null")
    // await promiseSerial(list.map(cash => async () => {
    //     console.log("TEST BEFORE RUNNING!")
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { user: "salitre" } });
    // }));
    
    // const list = (await (await db.collection('cash').find({ cart: { $exists: false } }).toArray()))
    
    const ONE_YEAR = 31556926000
    const list = await db.collection('communications').aggregate([
            { $match: { date: { $lte: Date.now() - 5* 60000 }, sent: true } },
        ]).toArray();

    console.log("FINISH", list.length)
        
    process.exit();
});
