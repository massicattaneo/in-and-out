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
const lovelyUsers = require("../web-app-deploy/private/lovely-beauty-clients.json")
const bcrypt = require('bcrypt');

// const devUrl = "mongodb://localhost:27017/in-and-out"

MongoClient.connect(url, async function (err, db) {
    if (err) return;

    // await google.authorize();
    // await google.initDriveSheets();

    // ADD USERS FROM LOVELY BEAUTY:
    // const created = Date.now()
    // await Promise.all(lovelyUsers.map(async (user) => {
    //     const email = user.email.includes("@lovely") ? "" : user.email
    //     await db.collection('users').insertOne({
    //         created,
    //         surname: '',
    //         name: user.name,
    //         tel: user.phone,
    //         privacy: false,
    //         email,
    //         active: true,
    //         lang: 'es',
    //         user: 'portanueva'
    //     });
    // }))

    // const pepe = await db.collection('users').find({ user: "portanueva" }).toArray()
    // console.log(pepe)
    // await Promise.all(pepe.map(async user => {
    //     return db.collection('users').updateOne(
    //         { _id: ObjectId(user._id) },
    //         { $set: { newsletter: true } }
    //     );
    // }))


    // await db.collection('users').updateOne(
    //         { _email: "carmengr88@hotmail.com" },
    //         { $set: { activationCode: "", hash: "", email: "carmengr88_@hotmail.com", _email: "", deleted:false } }
    // );
    // LOGOUT ONE USER
    // const items = (await db.collection('sessions').find({ session: { $regex: "irina.kiryiak@gmail.com" } }).toArray());
    // await Promise.all(items.map(item => db.collection('sessions').deleteOne({ _id: item._id, })));
    // console.warn(`${items.length} SESSIONS REMOVED`)

//     await db.collection('users').updateOne(
//             { _id: ObjectId("5bb1feceaccfa5001f6ee590") },
//             { $set: { activationCode: "", hash: "", email: "elo@assur.es" } }
//     );
//    const pepe = await db.collection('users').find({ _id: ObjectId("5bb1feceaccfa5001f6ee590")}).toArray()
//     console.log(pepe[0])

    // CHANGE CALENDAR DATE
    // const date = new Date(2022, 2, 27);
    // const until = new Date(2022, 9, 30);
    // while (date.getTime() < until.getTime()) {
    //     console.warn('PROCESSING DATE:', date);
    //     await newHours.workers
    //         .filter(({ column }) => column !== 'wendy')
    //         .reduce(async (prev, { googleId, column }) => {
    //             await prev;
    //             await google
    //                 .calendarGet(googleId, date)
    //                 .then(async (response) => {
    //                     for (let index = 0; index < response.items.length; index++) {
    //                         const { start, end, id, summary, location, description, extendedProperties } = response.items[index];
    //                         const startDate = new Date(start.dateTime);
    //                         const endDate = new Date(end.dateTime);
    //                         startDate.setTime(startDate.getTime() - 1 * 60 * 60 * 1000);
    //                         endDate.setTime(endDate.getTime() - 1 * 60 * 60 * 1000);
    //                         console.log(start, location, summary)
    //                     //     if (extendedProperties.private.fixedHour) {
    //                     //         console.warn('SKIPPED AS IT WAS PARSED BEFORE');
    //                     //         return Promise.resolve();
    //                     //     } else {
    //                     //         // console.warn('CHANGING HOUR', column, response.items[index])
    //                     //     }
    //                     //     extendedProperties.private.fixedHour = true;
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
    //                             // process.exit();
    //                         });
    //                     }
    //                 });
    //         }, Promise.resolve());
    //     date.setTime(date.getTime() + oneDayMilliseconds);
    // }


    // LOGOUT ALL ADMIN USERS
    // const items = (await db.collection('sessions').find({ session: { $regex: '"isAdmin":true' } }).toArray())
    // await Promise.all(items.map(item => db.collection('sessions').deleteOne({ _id: item._id, })));
    // console.warn(`${items.length} SESSIONS REMOVED`)

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
    // const from = new Date('2022-10-01:00:00');
    // const to = new Date('2022-12-31:23:00');
    // const { report } = await CashSummary(db, google, {
    //     from: from.getTime(),
    //     to: to.getTime(),
    //     maxCashAmount: 12020,
    //     saveBillNumbers: true
    // });

    // SAVE BILL NUMBERS:
    // await db.collection('centers').updateOne(
    //     { _id: ObjectId('5da2057be28a5ade820818b5')}, // SALITRE
    //     { $set : { 'lastBillNumber' : 38646 } }
    // );
    // await db.collection('centers').updateOne(
    //     { _id: ObjectId('5da2057ce28a5ade820818b7')}, // BUENAVENTURA
    //     { $set : { 'lastBillNumber' : 11881 } }
    // );
    // await db.collection('centers').updateOne(
    //     { _id: ObjectId('5da2057ce28a5ade820818b8')}, // ONLINE
    //     { $set : { 'lastBillNumber' : 1983 } }
    // );

    // orders not used - TOTAL AMOUNT
    // const items = (await db.collection('orders').find().toArray());
    // let total = 0;
    // items.forEach(order => {
    //     const hasNoItemUsed = order.cart.filter(item => item.used === true).length === 0;
    //     if (order.payed && hasNoItemUsed) {
    //         total += order.amount / 100
    //         console.log(order)
    //     }
    // })
    // console.log('TOTAL: €', total.toFixed(2))
    
    // get cash between dates
    // const list = await (await db.collection('cash').find({ date: { $gt: 1664180192398 }, user: 'null' }).toArray())
    // await Promise.all(list.map(function (doc) {
    //     return db.collection('cash').updateOne(
    //         { _id: doc._id },
    //         { $set: { user: 'salitre' } }
    //     );
    // }))


    // GET CASH WITH NULL USER
    // const list = await (await db.collection('cash').find({ date: { $gt: 1654041600000 }, user: 'null' }).toArray())
    // console.log(list.length)

    // db.collection('bonus').find({ clientId: ObjectId(oldClient) }).forEach(function (doc) {
    //     db.collection('bonus').update(
    //         { _id: doc._id },
    //         { $set: { clientId: ObjectId(newClient) } }
    //     );
    //     console.log(doc);
    // });
    

    // GET CASH WITH billNumber
    // const list = await (await db.collection('cash').find({ billNumber: "14034164" }).toArray())
    // console.log(list)

    // const list = await (await db.collection('cash').find().toArray())
    // console.log(list[10000])
    

    // ******************* SCRIPTS FOR NEW ADMIN ****************

    // POINT 0 LOGOUT ALL ADMIN USERS - DONE
    // const list = (await db.collection('sessions').find({ session: { $regex: '"isAdmin":true' } }).toArray())
    // await Promise.all(list.map(item => db.collection('sessions').deleteOne({ _id: item._id, })));

    // POINT 1 lowercase all users emails - DONE
    // const list = await (await db.collection('users').find({}).toArray())
    // await promiseSerial(list.map(user => async function () {
    //     await db.collection('users').updateOne({ _id: ObjectId(user._id) }, { $set: { email: user.email.toLowerCase() }});
    // }));
    
    // POINT 2. lowercase all orders emails - DONE
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { email: order.email.toLowerCase() }});
    // }));
    
    // POINT 3. update wrong orders userId - DONE
    // const list = await (await db.collection('orders').find({}).toArray())
    // const [order] = list.filter(i => i.userId === "salitre")
    // if (order) await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: null }});
    
    // POINT 4. update wrong orders userId - DONE
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     if (!order.userId) return
    //     const [user] = await db.collection('users').find({ _id: ObjectId(order.userId) }).toArray()
    //     if (!user) {
    //         const [emailUser] = await db.collection('users').find({ email: order.email }).toArray()
    //         await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { userId: emailUser._id }});
    //     }
    // }));
    
    // POINT 5. add a number date (timestamp) for all orders (for filtering on the admin app cash summary) - DONE
    // const list = await (await db.collection('orders').find({}).toArray())
    // await promiseSerial(list.map(order => async function () {
    //     const timestamp = new Date(order.created).getTime()
    //     await db.collection('orders').updateOne({ _id: ObjectId(order._id) }, { $set: { timestamp }});
    // }));
    
    // POINT 6. Create a client for each order user that do not have it - DONE
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

    // POINT 7. add a cash "online" input in the cash table for each online order and add his relative bill-number with the clientId - DONE
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
    
    // POINT 8. convert client emails fields to "communications" table - DONE
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

    // POINT 9. convert the itemKey in cash to cart - DONE
    // const list = (await (await db.collection('cash').find({ itemKey: { $exists: true } }).toArray()))
    // await promiseSerial(list.map(cash => async () => {
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { cart: [cash.itemKey] } });
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $unset: { itemKey: "" } });
    // }));
        
    // POINT 10: add cart to all cash - DONE
    // const list = (await (await db.collection('cash').find({ cart: { $exists: false } }).toArray()))
    // await db.collection('cash').updateMany(
    //     { cart: { $exists: false } },
    //     { $set: { cart: [] } }
    // )
        
    // POINT 11: Update null cash dates
    // const list = (await (await db.collection('cash').find({  }).toArray()))
    // const nullDateCash = list.filter(item => Number(item.date) !== item.date)
    // await promiseSerial(nullDateCash.map(cash => async () => {
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { date: 1499086800000 } });
    // }));

    // POINT 12: remove user null in cash
    // const list = (await (await db.collection('cash').find({  }).toArray())).filter(item => !item.user)
    // await promiseSerial(list.map(cash => async () => {
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { user: "salitre" } });
    // }));
    
    // POINT 13: remove user "null" in cash
    // const list = (await (await db.collection('cash').find({  }).toArray())).filter(item => item.user === "null")
    // await promiseSerial(list.map(cash => async () => {
    //     console.log("TEST BEFORE RUNNING!")
    //     await db.collection('cash').updateOne({ _id: ObjectId(cash._id) }, { $set: { user: "salitre" } });
    // }));
    
    // const list = (await (await db.collection('cash').find({ user: "online" }).toArray()))
    // console.log("FINISH", list[list.length -1])

    const CASH_STARTING_DATE = new Date('2021-10-12').getTime();
    const CASH_STARTING_AMOUNT = {
        salitre: 72212.64,
        buenaventura: 50,
        portanueva: 2000
    }
    const [{ total = 0 } = {}] = await db.collection('cash')
                .aggregate([ 
                    { $match: { 
                        type: 'efectivo', 
                        user: 'salitre',
                        date: { $gte: CASH_STARTING_DATE } }
                    },
                    { 
                        $group: { 
                            _id: null, 
                            total: { 
                                $sum: "$amount" 
                            } 
                        } 
                    }
                ]).toArray();

        console.log(total)
    
    process.exit();
});
