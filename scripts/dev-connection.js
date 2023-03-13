const fs = require("fs")
const { promiseSerial } = require("../web-app-deploy/pdf/common")
const access = require("../web-app-deploy/private/mongo-db-access")
const MongoClient = require("mongodb").MongoClient
const ObjectId = require("mongodb").ObjectID
const google = require("../web-app-deploy/google-api")({}, [])
const { getSpainOffset } = require("../web-app-deploy/shared")
const oneDayMilliseconds = 24 * 60 * 60 * 1000
const bcrypt = require("bcrypt")

const devUrl = "mongodb://localhost:27017/in-and-out"

MongoClient.connect(devUrl, async function (err, db) {
  if (err) return

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

  // ********* SCRIPTS FOR NEW_HOURS TO DB:

  await db.collection("centers").insertMany([
    {
      color: "#cdfaff",
      id: "salitre",
      index: 0,
      label: "Salitre",
      address: "Calle Salitre, 11, 29002 Málaga",
      tel: "951 131 460",
      mobile: "633 909 103",
      closed: false,
      physical: true,
      billRef: "14",
      bbvaRef: "334264736",
      google: {
        latitude: "36.7137894",
        longitude: "-4.4268794",
        placeId: "ChIJB7Rj8ZD3cg0R6eAKD3N_mD4",
        embedSrc:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3198.361993573424!2d-4.426823199999999!3d36.713866499999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd72f790f163b407%3A0x3e987f730f0ae0e9!2sIn%20And%20Out%20Beauty!5e0!3m2!1sit!2ses!4v1675713455629!5m2!1sit!2ses",
      },
      phone: "951 131 460",
    },
    {
      color: "#000000",
      id: "compania",
      index: 1,
      label: "COMPAÑIA",
      address: "CALLE COMPANIA, 42 - MÁLAGA",
      tel: "951 387 919",
      mobile: "695 685 291",
      closed: true,
      physical: true,
      billRef: "15",
      bbvaRef: null,
      google: { latitude: "", longitude: "", placeId: "", embedSrc: "" },
    },
    {
      color: "#ffcdcd",
      id: "buenaventura",
      index: 2,
      label: "Buenaventura",
      address: "C. Prta Buenaventura, 4, 29008 Málaga",
      tel: "951 387 919",
      mobile: "695 685 291",
      closed: false,
      physical: true,
      billRef: "16",
      bbvaRef: "334297272",
      google: {
        latitude: "36.723974",
        longitude: "-4.420582",
        placeId: "ChIJncIbQTX3cg0RYv19-GiRmJ4",
        embedSrc:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3197.94460971464!2d-4.420595!3d36.7238915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd72f735411bc29d%3A0x9e989168f87dfd62!2sIn%20And%20Out%20Belleza!5e0!3m2!1sit!2ses!4v1675713495845!5m2!1sit!2ses",
      },
      phone: "951 387 919",
    },
    {
      color: "#b8f4c2",
      id: "portanueva",
      index: 3,
      label: "Puertanueva",
      address: "C. Muro de Prta Nueva, 1, 29005 Málaga",
      tel: "951 394 352",
      mobile: "640 976 658",
      closed: false,
      physical: true,
      billRef: "18",
      bbvaRef: "358576098",
      google: {
        latitude: "36.72134332484761",
        longitude: "-4.4246213568642325",
        placeId: "ChIJg2vUfE_3cg0RpscM6frgYCU",
        embedSrc:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3198.0513194143973!2d-4.4246205!3d36.7213287!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd72f74f7cd46b83%3A0x2560e0fae90cc7a6!2sLovely%20Beautee%20Malaga%20%C2%B7%20Centro%20de%20Belleza!5e0!3m2!1sit!2ses!4v1675713173414!5m2!1sit!2ses",
      },
      phone: "951 394 352",
    },
    {
      color: "#f4ee8f",
      id: "online",
      index: 4,
      label: "ONLINE",
      address: "https://www.inandoutbelleza.es",
      tel: "",
      mobile: "",
      closed: false,
      physical: false,
      billRef: "17",
      bbvaRef: null,
      google: { latitude: "", longitude: "", placeId: "", embedSrc: "" },
    },
  ])

  await db.collection("workers").insertMany([
    {
      googleId: "info@inandoutbelleza.com",
      column: "carmen",
      title: "Carmen",
      index: 0,
      breakTimeDuration: 0.5,
      fullName: "Carmen Mellado",
      label: "Carmen",
    },
    {
      googleId: "nog1o7vqalre9raep4v5r8bfl8@group.calendar.google.com",
      column: "carmen_v",
      title: "Carmen V.",
      index: 1,
      breakTimeDuration: 0.5,
      fullName: "Carmen Vela",
      label: "Carmen V.",
    },
    {
      googleId: "63t8br7nmbaekjv8janmco6520@group.calendar.google.com",
      column: "estefania",
      title: "Estefania",
      index: 2,
      breakTimeDuration: 0.5,
      fullName: "Estefania Vera",
      label: "Estefania",
    },
    {
      googleId: "2euki6s03uvcpq2l2il4oqlslk@group.calendar.google.com",
      column: "irene",
      title: "Irene",
      index: 3,
      breakTimeDuration: 0.5,
      fullName: "Irene",
    },
    {
      googleId: "gihc2ns56av7up7ni23f56e7ko@group.calendar.google.com",
      column: "camila",
      title: "Camila",
      index: 4,
      breakTimeDuration: 0.5,
      fullName: "Camila",
    },
    {
      googleId: "8eupe3uc8g0psn6hr9noi879mo@group.calendar.google.com",
      column: "eila",
      title: "Eila",
      index: 5,
      breakTimeDuration: 0.5,
      fullName: "Eila",
    },
    {
      googleId: "pfpci44lhhot7jvlts3vj6jgss@group.calendar.google.com",
      column: "cristina",
      title: "Cristina",
      index: 6,
      breakTimeDuration: 0.5,
      fullName: "Cristina",
    },
    {
      googleId: "jd37uqnq6dlloin1ev5qevv5gc@group.calendar.google.com",
      column: "wendy",
      title: "Lista de espera",
      index: 7,
      breakTimeDuration: 0,
      fullName: "Lista de espera",
    },
    {
      googleId: "052ftq1qofm5ouoitfuddifokk@group.calendar.google.com",
      column: "andrea",
      title: "Andrea",
      index: 8,
      breakTimeDuration: 0.5,
      fullName: "Andrea",
    },
    {
      googleId: "gi46hn36qba2ds9kjf8daai2s4@group.calendar.google.com",
      column: "maria",
      title: "Maria",
      index: 9,
      breakTimeDuration: 0.5,
      fullName: "Maria",
    },
    {
      googleId: "l6oqvlsbr7m7v9s02o0sibnd4c@group.calendar.google.com",
      column: "lidia",
      title: "Lidia",
      index: 10,
      breakTimeDuration: 0.5,
      fullName: "Lidia",
    },
    {
      googleId: "1ule1go2bfh2ecnhmthi8h8t9k@group.calendar.google.com",
      column: "yolimar",
      title: "Yolimar",
      index: 11,
      breakTimeDuration: 0.5,
      fullName: "Yolimar",
    },
    {
      googleId: "5bdssa7lpq3fosesk1k1lhp1f0@group.calendar.google.com",
      column: "ana",
      title: "Ana",
      index: 12,
      breakTimeDuration: 0.5,
      fullName: "Ana",
      label: "Ana",
    },
    {
      googleId:
        "ea6a01c384cb50d68430b6e8a5881ee76e4373847025e1d296125a1e634a3f71@group.calendar.google.com",
      column: "javi",
      title: "Javi",
      index: 13,
      breakTimeDuration: 0.5,
      fullName: "Javi",
    },
    {
      googleId:
        "ab7804d7e2bb7860c5ee361c32023dd0322aa46e74659d39e2f43fb5405132b7@group.calendar.google.com",
      column: "virginia",
      title: "Virginia",
      index: 14,
      breakTimeDuration: 0.25,
      fullName: "Virginia",
    },
    {
      googleId:
        "ca57621721a3fa72e1c75082e57b1ccaff7821e0a8faffa74a79715360bfa509@group.calendar.google.com",
      column: "julia",
      title: "Yulia",
      index: 15,
      breakTimeDuration: 0.25,
      fullName: "Yulia",
    },
  ])

  await db.collection("calendars").insertOne({
    from: 1641078000000,
    to: 1704063599999,
    weeks: [
      {
        created: 1678639379771,
        days: [
          [],
          [
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678641165022 },
            { centerIndex: 0, workerIndex: 1, from: 10, to: 14, created: 1678641311305 },
            { centerIndex: 0, workerIndex: 9, from: 12, to: 20, created: 1678641369850 },
            { centerIndex: 0, workerIndex: 2, from: 12, to: 19.75, created: 1678641439119 },
            { centerIndex: 0, workerIndex: 3, from: 12, to: 20, created: 1678641464702 },
            { centerIndex: 0, workerIndex: 6, from: 12, to: 20, created: 1678641481295 },
            { centerIndex: 0, workerIndex: 10, from: 9.5, to: 18, created: 1678641524556 },
            { centerIndex: 0, workerIndex: 12, from: 9.5, to: 18, created: 1678641541243 },
            { centerIndex: 0, workerIndex: 7, from: 9.5, to: 20, created: 1678641586404 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678641734842 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678641777056 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678641792215 },
            { centerIndex: 3, workerIndex: 15, from: 10, to: 18, created: 1678641837622 },
            { centerIndex: 3, workerIndex: 14, from: 12, to: 20, created: 1678641900990 },
          ],
          [
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678641166316 },
            { centerIndex: 0, workerIndex: 1, from: 10, to: 14, created: 1678641313040 },
            { centerIndex: 0, workerIndex: 9, from: 12, to: 20, created: 1678641373712 },
            { centerIndex: 0, workerIndex: 2, from: 12, to: 19.75, created: 1678641440621 },
            { centerIndex: 0, workerIndex: 3, from: 12, to: 20, created: 1678641466685 },
            { centerIndex: 0, workerIndex: 6, from: 12, to: 20, created: 1678641483301 },
            { centerIndex: 0, workerIndex: 10, from: 9.5, to: 18, created: 1678641526700 },
            { centerIndex: 0, workerIndex: 12, from: 9.5, to: 18, created: 1678641543771 },
            { centerIndex: 0, workerIndex: 7, from: 9.5, to: 20, created: 1678641587747 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678641765256 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678641779352 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678641794535 },
            { centerIndex: 3, workerIndex: 15, from: 10, to: 18, created: 1678641839790 },
            { centerIndex: 3, workerIndex: 14, from: 12, to: 20, created: 1678641903102 },
          ],
          [
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678641168139 },
            { centerIndex: 0, workerIndex: 1, from: 10, to: 14, created: 1678641314584 },
            { centerIndex: 0, workerIndex: 2, from: 12, to: 19.75, created: 1678641442317 },
            { centerIndex: 0, workerIndex: 3, from: 12, to: 20, created: 1678641468958 },
            { centerIndex: 0, workerIndex: 6, from: 12, to: 20, created: 1678641485237 },
            { centerIndex: 0, workerIndex: 10, from: 9.5, to: 18, created: 1678641528764 },
            { centerIndex: 0, workerIndex: 12, from: 9.5, to: 18, created: 1678641545780 },
            { centerIndex: 0, workerIndex: 7, from: 9.5, to: 20, created: 1678641589355 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678641642514 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678641767639 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678641781760 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678641796456 },
            { centerIndex: 3, workerIndex: 15, from: 10, to: 18, created: 1678641841767 },
            { centerIndex: 3, workerIndex: 14, from: 12, to: 20, created: 1678641905638 },
            { centerIndex: 3, workerIndex: 9, from: 12, to: 20, created: 1678641964844 },
          ],
          [
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678641170155 },
            { centerIndex: 0, workerIndex: 1, from: 10, to: 14, created: 1678641316352 },
            { centerIndex: 0, workerIndex: 2, from: 12, to: 19.75, created: 1678641444470 },
            { centerIndex: 0, workerIndex: 3, from: 12, to: 20, created: 1678641470695 },
            { centerIndex: 0, workerIndex: 6, from: 12, to: 20, created: 1678641487365 },
            { centerIndex: 0, workerIndex: 10, from: 9.5, to: 18, created: 1678641531292 },
            { centerIndex: 0, workerIndex: 12, from: 9.5, to: 18, created: 1678641548285 },
            { centerIndex: 0, workerIndex: 7, from: 9.5, to: 20, created: 1678641590737 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678641644738 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678641769984 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678641783985 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678641798351 },
            { centerIndex: 3, workerIndex: 15, from: 10, to: 18, created: 1678641844023 },
            { centerIndex: 3, workerIndex: 14, from: 12, to: 20, created: 1678641907710 },
            { centerIndex: 3, workerIndex: 9, from: 12, to: 20, created: 1678641967117 },
          ],
          [
            { centerIndex: 0, workerIndex: 1, from: 10, to: 14, created: 1678641318408 },
            { centerIndex: 0, workerIndex: 2, from: 12, to: 19.75, created: 1678641446989 },
            { centerIndex: 0, workerIndex: 3, from: 12, to: 20, created: 1678641472613 },
            { centerIndex: 0, workerIndex: 6, from: 12, to: 20, created: 1678641489477 },
            { centerIndex: 0, workerIndex: 10, from: 9.5, to: 18, created: 1678641533092 },
            { centerIndex: 0, workerIndex: 12, from: 9.5, to: 18, created: 1678641550593 },
            { centerIndex: 0, workerIndex: 7, from: 9.5, to: 20, created: 1678641592546 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678641647418 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678641772089 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678641786561 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 18, created: 1678641819583 },
            { centerIndex: 3, workerIndex: 15, from: 10, to: 18, created: 1678641845775 },
            { centerIndex: 3, workerIndex: 14, from: 12, to: 20, created: 1678641910221 },
            { centerIndex: 3, workerIndex: 9, from: 12, to: 20, created: 1678641970966 },
          ],
          [],
        ],
      },
      {
        created: 1678642223893,
        days: [
          [],
          [
            { centerIndex: 3, workerIndex: 15, from: 12, to: 20, created: 1678642268426 },
            { centerIndex: 3, workerIndex: 14, from: 10, to: 18, created: 1678642343496 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678642380656 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678642393559 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678642415063 },
            { centerIndex: 0, workerIndex: 9, from: 9.5, to: 18, created: 1678642467760 },
            { centerIndex: 0, workerIndex: 2, from: 9.5, to: 17.75, created: 1678642493147 },
            { centerIndex: 0, workerIndex: 3, from: 9.5, to: 18, created: 1678642545175 },
            { centerIndex: 0, workerIndex: 6, from: 9.5, to: 18, created: 1678642556040 },
            { centerIndex: 0, workerIndex: 1, from: 16, to: 20, created: 1678642623532 },
            { centerIndex: 0, workerIndex: 10, from: 12, to: 20, created: 1678642653198 },
            { centerIndex: 0, workerIndex: 4, from: 12, to: 20, created: 1678642695616 },
            { centerIndex: 0, workerIndex: 12, from: 12, to: 20, created: 1678642724474 },
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678642743226 },
          ],
          [
            { centerIndex: 3, workerIndex: 15, from: 12, to: 20, created: 1678642270729 },
            { centerIndex: 3, workerIndex: 14, from: 10, to: 18, created: 1678642345624 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678642382865 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678642395880 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678642417983 },
            { centerIndex: 0, workerIndex: 9, from: 9.5, to: 18, created: 1678642469713 },
            { centerIndex: 0, workerIndex: 2, from: 9.5, to: 17.75, created: 1678642496531 },
            { centerIndex: 0, workerIndex: 3, from: 9.5, to: 18, created: 1678642546631 },
            { centerIndex: 0, workerIndex: 6, from: 9.5, to: 18, created: 1678642557520 },
            { centerIndex: 0, workerIndex: 1, from: 16, to: 20, created: 1678642624884 },
            { centerIndex: 0, workerIndex: 10, from: 12, to: 20, created: 1678642655654 },
            { centerIndex: 0, workerIndex: 4, from: 12, to: 20, created: 1678642700648 },
            { centerIndex: 0, workerIndex: 12, from: 12, to: 20, created: 1678642726762 },
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678642745227 },
          ],
          [
            { centerIndex: 3, workerIndex: 15, from: 12, to: 20, created: 1678642272905 },
            { centerIndex: 3, workerIndex: 9, from: 10, to: 18, created: 1678642334312 },
            { centerIndex: 3, workerIndex: 14, from: 10, to: 18, created: 1678642347696 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678642385007 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678642398167 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678642419568 },
            { centerIndex: 0, workerIndex: 2, from: 9.5, to: 17.75, created: 1678642504004 },
            { centerIndex: 0, workerIndex: 3, from: 9.5, to: 18, created: 1678642548775 },
            { centerIndex: 0, workerIndex: 6, from: 9.5, to: 18, created: 1678642559160 },
            { centerIndex: 0, workerIndex: 1, from: 16, to: 20, created: 1678642626316 },
            { centerIndex: 0, workerIndex: 10, from: 12, to: 20, created: 1678642656815 },
            { centerIndex: 0, workerIndex: 4, from: 12, to: 20, created: 1678642703110 },
            { centerIndex: 0, workerIndex: 12, from: 12, to: 20, created: 1678642728930 },
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678642747570 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678642774020 },
          ],
          [
            { centerIndex: 3, workerIndex: 15, from: 12, to: 20, created: 1678642274841 },
            { centerIndex: 3, workerIndex: 9, from: 10, to: 18, created: 1678642336408 },
            { centerIndex: 3, workerIndex: 14, from: 10, to: 18, created: 1678642349848 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678642386975 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678642400696 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 19, created: 1678642421439 },
            { centerIndex: 0, workerIndex: 2, from: 9.5, to: 17.75, created: 1678642506324 },
            { centerIndex: 0, workerIndex: 3, from: 9.5, to: 18, created: 1678642550167 },
            { centerIndex: 0, workerIndex: 6, from: 9.5, to: 18, created: 1678642560768 },
            { centerIndex: 0, workerIndex: 1, from: 16, to: 20, created: 1678642628068 },
            { centerIndex: 0, workerIndex: 10, from: 12, to: 20, created: 1678642659295 },
            { centerIndex: 0, workerIndex: 4, from: 12, to: 20, created: 1678642705232 },
            { centerIndex: 0, workerIndex: 12, from: 12, to: 20, created: 1678642731177 },
            { centerIndex: 0, workerIndex: 0, from: 9.5, to: 18, created: 1678642749435 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678642771972 },
          ],
          [
            { centerIndex: 3, workerIndex: 15, from: 12, to: 20, created: 1678642276881 },
            { centerIndex: 3, workerIndex: 9, from: 10, to: 18, created: 1678642339522 },
            { centerIndex: 3, workerIndex: 14, from: 10, to: 18, created: 1678642351728 },
            { centerIndex: 2, workerIndex: 11, from: 10.5, to: 19, created: 1678642389232 },
            { centerIndex: 2, workerIndex: 8, from: 10.5, to: 19, created: 1678642403976 },
            { centerIndex: 2, workerIndex: 5, from: 10, to: 18, created: 1678642447865 },
            { centerIndex: 0, workerIndex: 2, from: 9.5, to: 17.75, created: 1678642508350 },
            { centerIndex: 0, workerIndex: 3, from: 9.5, to: 18, created: 1678642551732 },
            { centerIndex: 0, workerIndex: 6, from: 9.5, to: 18, created: 1678642562632 },
            { centerIndex: 0, workerIndex: 1, from: 16, to: 20, created: 1678642629948 },
            { centerIndex: 0, workerIndex: 10, from: 12, to: 20, created: 1678642660615 },
            { centerIndex: 0, workerIndex: 4, from: 12, to: 20, created: 1678642707465 },
            { centerIndex: 0, workerIndex: 12, from: 12, to: 20, created: 1678642733370 },
            { centerIndex: 0, workerIndex: 13, from: 16.5, to: 20, created: 1678642770116 },
          ],
          [],
        ],
      },
    ],
  })

  console.log("FINISH")

  process.exit()
})
