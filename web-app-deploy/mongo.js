const pdf = require("pdf-parse")
const ONE_DAY = 24 * 60 * 60 * 1000
const MongoClient = require("mongodb").MongoClient
const MongoStore = require("express-brute-mongo")
const bcrypt = require("bcrypt")
const ObjectID = require("mongodb").ObjectID
const { isValidEmail } = require("./mongo-utils")
const { getBBVAEntries } = require("./get-bbva-entries")
const { adminUsers } = require("./private/admin-users")
const { getMongoProdUri } = require("./mongo-utils")

let cartPriorityMemo

function getObjectId(id) {
  try {
    return new ObjectID(id)
  } catch (e) {
    return e
  }
}

function clean(o) {
  return Object.keys(o)
    .filter(i => i !== "_id")
    .reduce(function (ret, key) {
      ret[key] = o[key]
      if (typeof ret[key] === "string") {
        ret[key] = o[key].trim()
      }
      if (key.indexOf("Id") !== -1 && o[key] !== "" && o[key].length <= 40) {
        try {
          ret[key] = getObjectId(o[key])
        } catch (e) {
          ret[key] = o[key]
        }
      }
      if (key === "email") {
        ret[key] = o[key].trim().toLowerCase()
      }
      return ret
    }, {})
}

async function getCartPriorityMemo(db) {
  const [item] = await db
    .collection("cash")
    .aggregate([
      { $unwind: "$cart" },
      { $group: { _id: "$cart", count: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          cart_details: {
            $push: {
              cart: "$_id",
              count: "$count",
            },
          },
        },
      },
      { $project: { _id: 0, cart_details: 1 } },
    ])
    .toArray()
  if (!item) return []
  return item.cart_details
    .sort((first, second) => second.count - first.count)
    .map(item => item.cart)
}

module.exports = function (isDeveloping, utils) {
  const obj = {}
  const url = isDeveloping ? `mongodb://localhost:27017/in-and-out` : getMongoProdUri()
  let db

  obj.connect = function () {
    return new Promise(function (res, rej) {
      const store = new MongoStore(function (ready) {
        MongoClient.connect(url, async function (err, DB) {
          if (err) {
            rej(new Error("dbError"))
          } else {
            db = DB
            ready(db.collection("bruteforce-store"))
            cartPriorityMemo = await getCartPriorityMemo(db)
            setInterval(async () => {
              cartPriorityMemo = await getCartPriorityMemo(db)
            }, 24 * 60 * 60 * 1000) // 24 hour
            res({ store, db })
          }
        })
      })
    })
  }

  obj.insertSmartUser = function ({ email, password }) {
    return new Promise((resolve, rej) => {
      const insert = {
        created: Date.now(),
        hash: bcrypt.hashSync(password, 10),
        surname: "",
        activationCode: bcrypt.hashSync(password, 4),
        name: "",
        tel: "",
        privacy: false,
        newsletter: false,
        email: email.toLowerCase(),
        active: true,
        lang: "es",
        user: "online",
        isSmartInactive: true,
      }
      db.collection("users").insertOne(insert, function (err, res) {
        if (err) rej(new Error("dbError"))
        else {
          Object.assign(insert, { id: res.insertedId })
          utils.wss.broadcast(
            JSON.stringify({
              type: "insertUser",
              data: insert,
            }),
          )
          resolve(insert)
        }
      })
    })
  }

  obj.getPublicDb = async () => {
    return {
      adminUsers,
      centers: await db.collection("centers").find({}).toArray(),
      workers: (await db.collection("workers").find({}).toArray()).sort(
        (a, b) => a.index - b.index,
      ),
      calendars: (await db.collection("calendars").find({}).toArray()).sort(
        (first, second) => second.from - first.from,
      ),
    }
  }

  obj.insertOrderOnlineUser = function ({ email = "" }) {
    const password = Math.floor(100000 + Math.random() * 900000).toString()
    const [name = ""] = email.split("@")
    return new Promise((resolve, rej) => {
      const insert = {
        created: Date.now(),
        hash: bcrypt.hashSync(password, 10),
        surname: "",
        activationCode: bcrypt.hashSync(password, 4),
        name,
        tel: "",
        privacy: true,
        newsletter: false,
        email: email.toLowerCase(),
        active: true,
        lang: "es",
        user: "online",
      }
      db.collection("users").insertOne(insert, function (err, res) {
        if (err) rej(new Error("dbError"))
        else {
          Object.assign(insert, { id: res.insertedId })
          utils.wss.broadcast(
            JSON.stringify({
              type: "insertUser",
              data: insert,
            }),
          )
          resolve(insert)
        }
      })
    })
  }

  obj.insertUser = function ({
    email,
    password,
    surname = "",
    tel = "",
    name,
    lang,
    user = "online",
    privacy = true,
  }) {
    return new Promise(function (resolve, rej) {
      db.collection("users")
        .find({ email })
        .toArray(function (err, result) {
          if (err) return rej(new Error("generic"))
          if (result.length) return rej(new Error("existingUser"))
          const activationCode = bcrypt.hashSync(password, 4)
          const hash = bcrypt.hashSync(password, 10)
          const created = Date.now()
          const insert = {
            created,
            hash,
            surname,
            activationCode,
            name,
            tel,
            privacy,
            email: email.toLowerCase(),
            active: false,
            lang,
            user,
          }
          db.collection("users").insertOne(insert, function (err, res) {
            if (err) rej(new Error("dbError"))
            else {
              Object.assign(insert, { id: res.insertedId })
              utils.wss.broadcast(
                JSON.stringify({
                  type: "insertUser",
                  data: Object.assign({ id: res.insertedId }, insert),
                }),
              )
              resolve(insert)
            }
          })
        })
    })
  }

  obj.activateUser = function (activationCode) {
    return new Promise(function (res, rej) {
      db.collection("users").findOneAndUpdate(
        { activationCode },
        { $set: { active: true } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return rej(new Error("generic"))
          if (r.value === null) return rej(new Error("generic"))
          res(r.value)
        },
      )
    })
  }

  obj.getNewslettersUsers = async function () {
    const users = await obj.rest.get("users")
    return users.filter(user => {
      if (!isValidEmail(user.email)) return false
      if (user.newsletter === false) return false
      if (user.active === false) return false
      if (user.deleted === true) return false
      if (user.isSmartInactive === true) return false
      return true
    })
  }

  obj.getUser = function (data) {
    return new Promise(function (resolve, reject) {
      db.collection("users").findOne(data, function (err, user) {
        if (err) return reject(new Error("generic"))
        if (!user) return resolve({ anonymous: true })
        resolve(user)
      })
    })
  }

  obj.getAll = function (collectionName) {
    return new Promise(function (resolve, reject) {
      db.collection(collectionName)
        .find()
        .toArray(function (err, data) {
          if (err) return reject(new Error("generic"))
          resolve(data)
        })
    })
  }

  obj.recoverPassword = function (data) {
    return new Promise(function (resolve, reject) {
      db.collection("users").findOneAndUpdate(
        data,
        { $set: { activationCode: bcrypt.hashSync("re$eTPas$W0Rd", 4) } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          resolve(r.value)
        },
      )
    })
  }

  obj.resetPassword = function ({ activationCode, password }) {
    return new Promise(function (resolve, reject) {
      db.collection("users").findOneAndUpdate(
        { activationCode },
        { $set: { hash: bcrypt.hashSync(password, 10), active: true } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          resolve(r.value)
        },
      )
    })
  }

  obj.resetPasswordFromEmail = function ({ email, password }) {
    return new Promise(function (resolve, reject) {
      db.collection("users").findOneAndUpdate(
        { email },
        { $set: { hash: bcrypt.hashSync(password, 10), active: true } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          resolve(r.value)
        },
      )
    })
  }

  obj.privacyAccept = function ({ h }) {
    const email = Buffer.from(h, "base64").toString("ascii")
    return new Promise(function (resolve, reject) {
      db.collection("users").findOneAndUpdate(
        { email },
        { $set: { privacy: true } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          resolve(r.value)
        },
      )
    })
  }
  obj.unsubscribeNewsletter = function ({ h }) {
    const email = Buffer.from(h, "base64").toString("ascii")
    return new Promise(function (resolve, reject) {
      db.collection("users").findOneAndUpdate(
        { email },
        { $set: { newsletter: false } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          resolve(r.value)
        },
      )
    })
  }

  obj.deleteUser = function ({ userId }) {
    return new Promise(async function (resolve, reject) {
      const { email } = await obj.getUser({ _id: getObjectId(userId) })
      if (!email) return reject(new Error("missingUser"))
      db.collection("users").findOneAndUpdate(
        { email },
        { $set: { deleted: true, _email: email, email: "" } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingUser"))
          utils.wss.broadcast(JSON.stringify({ type: "deleteUser", data: r.value }))
          resolve(r.value)
        },
      )
    })
  }

  obj.loginUser = function ({ email, password }) {
    return new Promise(function (resolve, rej) {
      db.collection("users").findOne({ email }, function (err, user) {
        if (err) return rej(new Error("generic"))
        if (!user) return rej(new Error("wrongEmail"))
        if (!user.active) return rej(new Error("inactiveUser"))
        bcrypt.compare(password, user.hash, function (err, res) {
          if (err) return rej(new Error("generic"))
          if (!res) return rej(new Error("wrongPassword"))
          resolve(user)
        })
      })
    })
  }

  obj.reviewsList = function () {
    return new Promise(function (resolve, reject) {
      db.collection("reviews")
        .find({}, { limit: 100 })
        .sort({ created: -1 })
        .toArray(function (err, res) {
          resolve(res)
        })
    })
  }

  obj.insertReview = function ({ rate, description, userId, lang }) {
    return new Promise(async function (resolve, rej) {
      const { name } = await obj.getUser({ _id: getObjectId(userId) }).catch(rej)
      db.collection("reviews").insertOne(
        {
          name,
          rate,
          description,
          created: Date.now(),
          userId,
          lang,
        },
        function (err, res) {
          if (err) rej(new Error("dbError"))
          else {
            resolve(res.ops[0])
          }
        },
      )
    })
  }

  obj.favouriteTreatment = function ({ treatmentId, value, userId }) {
    db.collection("favourites").update(
      { treatmentId, userId },
      { treatmentId, userId, value },
      { upsert: true },
    )
    return Promise.resolve()
  }

  obj.getUserData = function (userId) {
    return new Promise(function (resolve, reject) {
      db.collection("favourites")
        .find({ userId, value: true })
        .toArray(function (err, res) {
          resolve(res.map(i => i.treatmentId))
        })
    })
  }

  obj.buy = function ({ cart = [], amount, email, sendTo }) {
    return new Promise(function (resolve, reject) {
      const created = new Date()
      const doc = {
        sendTo,
        cart,
        email,
        amount,
        payed: false,
        created: created.toISOString(),
        timestamp: created.getTime(),
        userId: null,
      }
      db.collection("orders").insertOne(doc, function (err, res) {
        if (err) reject(new Error("dbError"))
        else {
          Object.assign(doc, { id: res.insertedId })
          resolve(doc)
        }
      })
    })
  }

  obj.confirmBuy = function ({ id, stripeId, amount, last4, userId }) {
    return new Promise(function (resolve, reject) {
      db.collection("orders").findOneAndUpdate(
        { _id: id },
        { $set: { payed: true, stripeId, amount, last4, userId } },
        { returnOriginal: false },
        function (err, r) {
          if (err) return reject(new Error("generic"))
          if (r.value === null) return reject(new Error("missingOrder"))
          utils.wss.broadcast(JSON.stringify({ type: "insert-rest-orders", data: r.value }))
          resolve(r.value)
        },
      )
    })
  }

  obj.getReviewsInfo = function () {
    const col = db.collection("reviews")
    return Promise.all([
      new Promise(async function (resolve, reject) {
        col.aggregate([{ $count: "count" }]).toArray(function (err, docs) {
          if (err) return reject(new Error("generic"))
          resolve(docs)
        })
      }),
      new Promise(async function (resolve, reject) {
        col
          .aggregate([{ $group: { _id: null, average: { $avg: "$rate" } } }])
          .toArray(function (err, docs) {
            if (err) return reject(new Error("generic"))
            resolve(docs)
          })
      }),
    ]).then(function (array) {
      return {
        count: array && array[0].length ? array[0][0].count : [],
        average: array && array[1].length ? array[1][0].average : 0,
      }
    })
  }

  obj.getOrderInfo = function (id) {
    return new Promise(function (resolve, reject) {
      db.collection("orders").findOne({ _id: getObjectId(id) }, function (err, order) {
        if (err) return reject(new Error("generic"))
        if (!order) return reject(new Error("generic"))
        resolve(order)
      })
    })
  }

  obj.getActualBillNumber = async function (centerId) {
    const center = (await obj.getPublicDb()).centers.find(c => c.id === centerId)
    const [cash = { billNumber: 0 }] = await db
      .collection("cash")
      .aggregate([
        {
          $match: {
            billNumber: {
              $exists: true,
              $gte: Number(`${center.billRef}000000`),
              $lte: Number(`${center.billRef}999999`),
            },
          },
        },
        { $sort: { billNumber: -1 } },
      ])
      .toArray()
    return {
      number: Number(cash.billNumber.toString().replace(center.billRef, "")),
      billRef: center.billRef,
      centerId,
    }
  }

  obj.getLastBillNumbers = async () => {
    const { centers } = await obj.getPublicDb()
    return Promise.all(
      centers
        .filter(cent => !cent.closed)
        .map(center => {
          return obj.getActualBillNumber(center.id)
        }),
    )
  }

  obj.rest = {
    get: function (table, filter = "") {
      const find = {}
      const filters = filter.split("&")
      filters.forEach(f => {
        if (f.indexOf(">") !== -1) {
          const tmp = f.split(">")
          find[tmp[0]] = find[tmp[0]] || {}
          find[tmp[0]]["$gt"] = Number(tmp[1])
        }
        if (f.indexOf("<") !== -1) {
          const tmp = f.split("<")
          find[tmp[0]] = find[tmp[0]] || {}
          find[tmp[0]]["$lt"] = Number(tmp[1])
        }
        if (f.indexOf("=") !== -1) {
          const tmp = f.split("=")
          if (tmp[0].toLowerCase().indexOf("id") !== -1) {
            try {
              find[tmp[0]] = getObjectId(tmp[1])
            } catch (e) {
              find[tmp[0]] = tmp[1]
            }
          } else {
            find[tmp[0]] = tmp[1]
          }
        }
      })
      return new Promise(async function (resolve, rej) {
        db.collection(table)
          .find(find)
          .toArray(function (err, result) {
            if (err) return rej(new Error("generic"))
            resolve(result)
          })
      })
    },
    insert: function (table, body) {
      return new Promise(async function (resolve, rej) {
        db.collection(table).insertOne(clean(body), function (err, res) {
          if (err) rej(new Error("dbError"))
          else {
            const data = Object.assign({ _id: res.insertedId }, body)
            const type = `insert-rest-${table}`
            utils.wss.broadcast(JSON.stringify({ type, data }))
            resolve(data)
          }
        })
      })
    },
    update: function (table, id, body) {
      return new Promise(async function (resolve, rej) {
        db.collection(table).findOneAndUpdate(
          { _id: getObjectId(id) },
          { $set: clean(body) },
          { returnOriginal: false },
          function (err, r) {
            if (err) return rej(new Error("generic"))
            if (r.value === null) return rej(new Error("generic"))
            const type = `update-rest-${table}`
            utils.wss.broadcast(JSON.stringify({ type, data: r.value }))
            resolve(r.value)
          },
        )
      })
    },
    delete: function (table, id) {
      return new Promise(async function (resolve, rej) {
        const item = await obj.rest.get(table, `_id=${id}`)
        db.collection(table).remove({ _id: getObjectId(id) }, function (err, res) {
          if (err) rej(new Error("dbError"))
          else {
            const type = `delete-rest-${table}`
            if (item[0]) {
              utils.wss.broadcast(JSON.stringify({ type, data: item[0] }))
            }
            resolve(item[0])
          }
        })
      })
    },
  }

  const CASH_STARTING_DATE = new Date("2021-10-12").getTime()
  const CASH_STARTING_AMOUNT = {
    salitre: -72292.64,
    buenaventura: 50,
    portanueva: -775,
  }
  obj.getActualCash = async user => {
    const [{ total = 0 } = {}] = await db
      .collection("cash")
      .aggregate([
        {
          $match: {
            type: "efectivo",
            user,
            date: { $gte: CASH_STARTING_DATE },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ])
      .toArray()
    return total + CASH_STARTING_AMOUNT[user]
  }

  obj.cartPriority = async () => {
    if (!cartPriorityMemo) return getCartPriorityMemo(db)
    return cartPriorityMemo
  }

  obj.getBarCodes = async ({ products }) => {
    const codes = products.map(item => {
      const barcodes = item.codigobarras
        .split(",")
        .map(item => item.trim())
        .filter(item => item)
      return { itemKey: item.identificador, barcodes }
    })
    const dbCodes = await db.collection("barcodes").find().toArray()
    dbCodes.forEach(({ itemKey, barcode }) => {
      const item = codes.find(item => item.itemKey === itemKey)
      if (item) {
        item.barcodes.push(barcode)
      } else {
        codes.push({ itemKey, barcodes: [barcode] })
      }
    })
    return codes
  }

  /**
   *
   * @param {Buffer} dataBuffer the pdf file buffer
   * @returns {Promise<void>}
   */
  obj.insertBBVAMonthExtract = dataBuffer => {
    return pdf(dataBuffer)
      .then(async data => {
        if (!data.text)
          return {
            items: 0,
            inserted: 0,
            skipped: 0,
          }
        const [, accountNumber] = data.text.match(/Cuenta: (.*)/)
        const [, month, year] = data.text.match(/Período: (\w*) (\d*)/)
        const string = data.text.split("\n").join("")
        const start = string.substring(string.indexOf("BBVAESMMXXX") + 11)
        const mongoDbList = await (await db.collection("bbva").find({})).toArray()
        const newUploadedList = getBBVAEntries(start, (await obj.getPublicDb()).centers)
        const items = await Promise.all(
          newUploadedList.map(async newItem => {
            const find = mongoDbList.find(dbItem => {
              const properties = Object.keys(newItem)
              return (
                properties.filter(key => dbItem[key] === newItem[key]).length === properties.length
              )
            })
            if (!find) {
              await obj.rest.insert("bbva", newItem)
              return newItem
            }
            return null
          }),
        )
        return {
          items: items.filter(item => item),
          inserted: items.filter(item => item).length,
          skipped: items.filter(item => !item).length,
        }
      })
      .catch(() => {
        return {
          items: 0,
          inserted: 0,
          skipped: 0,
        }
      })
  }

  obj.cashSummary = async () => {
    const ONE_YEAR = 31556926000
    const data = await db
      .collection("cash")
      .aggregate([
        {
          $match: {
            description: { $ne: "Deposito en Banco" },
            date: { $gte: Date.now() - 3 * ONE_YEAR },
          },
        },
        { $addFields: { timestamp: { $add: [new Date(0), "$date"] } } },
        { $addFields: { isExpense: { $lt: ["$amount", 0] } } },
        {
          $addFields: {
            year: {
              $year: {
                date: "$timestamp",
              },
            },
            month: {
              $month: {
                date: "$timestamp",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              type: "$type",
              user: "$user",
              month: "$month",
              year: "$year",
              isExpense: "$isExpense",
            },
            amount: { $sum: "$amount" },
          },
        },
      ])
      .toArray()
    return data.map(item => ({ amount: item.amount, ...item._id }))
  }

  obj.comparingCashSummary = async (from, to) => {
    const list = await db
      .collection("cash")
      .aggregate([
        { $match: { type: "tarjeta", date: { $gte: from, $lte: to } } },
        { $addFields: { timestamp: { $add: [new Date(0), "$date"] } } },
        {
          $addFields: {
            year: {
              $year: {
                date: "$timestamp",
              },
            },
            month: {
              $month: {
                date: "$timestamp",
              },
            },
            day: {
              $dayOfMonth: {
                date: "$timestamp",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              user: "$user",
              day: "$day",
              month: "$month",
              year: "$year",
            },
            amount: { $sum: "$amount" },
          },
        },
      ])
      .toArray()

    const listBBVA = await db
      .collection("bbva")
      .aggregate([
        { $match: { user: { $ne: null }, date: { $gte: from, $lte: to } } },
        { $match: { user: { $ne: "online" } } },
        { $addFields: { timestamp: { $add: [new Date(0), "$date"] } } },
        {
          $addFields: {
            year: {
              $year: {
                date: "$timestamp",
              },
            },
            month: {
              $month: {
                date: "$timestamp",
              },
            },
            day: {
              $dayOfMonth: {
                date: "$timestamp",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              user: "$user",
              day: "$day",
              month: "$month",
              year: "$year",
            },
            amount: { $sum: "$amount" },
          },
        },
      ])
      .toArray()

    return (await obj.getPublicDb()).centers
      .filter(center => center.physical)
      .map(center => {
        const conv = list
          .filter(item => item._id.user === center.id)
          .reduce((acc, item) => {
            const fullDate = `${item._id.year}-${item._id.month}-${item._id.day}`
            const bbva = listBBVA.find(bbva => {
              return (
                fullDate === `${bbva._id.year}-${bbva._id.month}-${bbva._id.day}` &&
                bbva._id.user === item._id.user
              )
            }) || { amount: 0 }
            return {
              ...acc,
              [fullDate]: {
                amount: item.amount,
                bbva: bbva.amount,
                user: item._id.user,
              },
            }
          }, {})
        const arr = Object.entries(conv).map(([dateString, item]) => {
          return { dateString, ...item }
        })
        return arr
      })
      .flat()
  }

  obj.unsentProductOrders = async () => {
    return await db
      .collection("orders")
      .aggregate([
        { $unwind: "$cart" },
        { $addFields: { cartUsed: "$cart.used" } },
        { $addFields: { cartId: "$cart.id" } },
        {
          $match: {
            payed: { $eq: true },
            cartUsed: { $eq: false },
            cartId: { $regex: /PRD-/ },
          },
        },
        {
          $group: {
            _id: "$userId",
            count: { $sum: 1 },
            timestamps: { $addToSet: "$timestamp" },
          },
        },
      ])
      .toArray()
  }

  return obj
}
