const access = require("./private/mongo-db-access")
let text = process.env.APP_CONFIG || JSON.stringify(access.config)
const config = JSON.parse(text)

const getMongoProdUri = () => {
  const psw = encodeURIComponent(access.password)
  return `mongodb://${config.mongo.user}:${psw}@${config.mongo.hostString}`
}

const regExp =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const isValidEmail = email => regExp.test(email || "")

module.exports = {
  getMongoProdUri,
  isValidEmail,
}
