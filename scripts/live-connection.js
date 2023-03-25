const { promiseSerial } = require("../web-app-deploy/pdf/common")
const access = require("../web-app-deploy/private/mongo-db-access")
const MongoClient = require("mongodb").MongoClient
const config = access.config
const ObjectId = require("mongodb").ObjectID
const url = `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${
  config.mongo.hostString
}`

// const devUrl = "mongodb://localhost:27017/in-and-out"

MongoClient.connect(url, async function (err, db) {
  if (err) return

  // await db
  //   .collection("cash")
  //   .updateOne(
  //     { _id: ObjectId("6411fe714388a80033cee8d5") },
  //     { $set: { amount: 0, description: "TARJETA REGALO (0 Euro)" } },
  //   )

  const list = await db
    .collection("bonus")
    .find({ _id: ObjectId("63ee04ce867e84002f0701fc") })
    .toArray()
  console.log(list)
  process.exit()
})
