const createTemplate = require("./mailer/createTemplate")
const {
  confirmRegistrationUrl,
  registerUrl,
  loginUrl,
  adminLoginUrl,
  logoutUrl,
  logAdminStatus,
  logStatusUrl,
  recoverUrl,
  resetUrl,
  deleteAccountUrl,
  privacyEmailUrl,
  newsletterUrl,
} = require("./serverInfo")
const ObjectId = require("mongodb").ObjectID
const fs = require("fs")
const path = require("path")
const { clientVersion } = require("./client-version")
const { isValidEmail } = require("./mongo-utils")

function getObjectId(id) {
  try {
    return new ObjectId(id)
  } catch (e) {
    return e
  }
}

const oneTimeAdminCodes = {}

module.exports = function ({
  app,
  mongo,
  google,
  mailer,
  bruteforce,
  requiresLogin,
  requiresAdmin,
  isDeveloping,
}) {
  const origin = isDeveloping ? "http://localhost:4200" : "https://www.inandoutbelleza.es"

  app.get(logStatusUrl, requiresLogin, async function (req, res) {
    const userId = req.session.userId
    const {
      email,
      anonymous,
      _id,
      privacy,
      newsletter = true,
      name,
      tel,
    } = await mongo.getUser({ _id: getObjectId(userId) })
    if (anonymous || !email) {
      res.send({ clientVersion })
    } else {
      const bookings = await google.getBookings(email)
      // const bonusCards = (await mongo.rest.get('bonus', `clientId=${userId}`))
      const bonusCards = []
      const onlineOrders = (await mongo.rest.get("orders", `email=${email}`)).map(order => ({
        ...order,
        created: new Date(order.created).getTime(),
      }))
      const data = {
        id: _id,
        favourites: await mongo.getUserData(userId),
        hasBonusCards: bonusCards.length > 0,
        bonusCards: bonusCards.filter(card => !card.finished),
        orders: onlineOrders.filter(order => order.payed),
        bookings,
        privacy,
        newsletter,
        name,
        tel,
        clientVersion,
      }
      Object.assign(data, { logged: true, email: req.session.email })
      res.send(data)
    }
  })

  app.get(logAdminStatus, requiresAdmin, async function (req, res) {
    const { adminUsers } = await mongo.getPublicDb()
    const user = adminUsers.find(u => u.id === req.session.userId)
    if (user) {
      const toSend = Object.assign({ logged: true, clientVersion }, user)
      return res.send(toSend)
    } else {
      return res.send({ clientVersion })
    }
  })

  app.post(newsletterUrl, requiresLogin, async function (req, res) {
    mongo.rest.update("users", req.session.userId, {
      newsletter: req.body.newsletter,
    })
    res.send("ok")
  })

  app.get(confirmRegistrationUrl, async function response(req, res) {
    mongo
      .activateUser(req.query.activationCode)
      .then(async function () {
        const { lang } = await mongo.getUser({ activationCode: req.query.activationCode })
        const url = lang === "es" ? "/es/cuenta/confirmacion" : "/"
        res.redirect(url)
      })
      .catch(function (err) {
        res.status(500)
        res.send(err.message)
      })
  })

  app.post(privacyEmailUrl, function (req, res) {
    mongo
      .recoverPassword({ email: req.body.email })
      .then(function (user) {
        mailer.send(createTemplate("privacyEmail", user))
        res.send("ok")
      })
      .catch(function (err) {
        res.status(500)
        res.send(err.message)
      })
  })

  app.post(recoverUrl, function (req, res) {
    mongo
      .recoverPassword({ email: req.body.email })
      .then(function (user) {
        mailer.send(createTemplate("recoverEmail", user))
        res.send("ok")
      })
      .catch(function (err) {
        res.status(500)
        res.send(err.message)
      })
  })

  app.get("/api/privacy-accept", bruteforce.prevent, function (req, res) {
    const file = fs.readFileSync(path.resolve(__dirname, "blank.html"), "utf-8")
    mongo
      .privacyAccept(req.query)
      .then(function () {
        res.send(file.replace("{{center_message}}", "Gracias por confiar en nosotros"))
      })
      .catch(function (err) {
        res.status(500)
        res.send(file.replace("{{center_message}}", "Ops algo saliò mal ..."))
      })
  })

  app.get("/api/unsubscribe-newsletter", bruteforce.prevent, function (req, res) {
    const file = fs.readFileSync(path.resolve(__dirname, "blank.html"), "utf-8")
    mongo
      .unsubscribeNewsletter(req.query)
      .then(function () {
        res.send(file.replace("{{center_message}}", "Hemos acceptado tu solicitud ..."))
      })
      .catch(function (err) {
        res.status(500)
        res.send(file.replace("{{center_message}}", "Ops algo saliò mal ..."))
      })
  })

  app.post(resetUrl, function (req, res) {
    mongo
      .resetPassword(req.body)
      .then(function () {
        res.send("ok")
      })
      .catch(function (err) {
        res.status(500)
        res.send(err.message)
      })
  })

  app.post("/api/login/smart-login", bruteforce.prevent, async function (req, res) {
    if (req.headers.origin !== origin && !isDeveloping) {
      res.status(500)
      return res.send("Wrong origin")
    }
    if (!req.session) {
      res.status(500)
      return res.send("Missing session")
    }
    const { email } = req.body
    if (!isValidEmail(email)) {
      res.status(500)
      return res.send("invalid email")
    }
    const password = Math.floor(100000 + Math.random() * 900000).toString()
    const [user] = await mongo.rest.get("users", `email=${email}`)
    if (user) {
      await mongo.resetPasswordFromEmail({ email, password })
    } else {
      await mongo.insertSmartUser({ email, password })
    }
    mailer.send(createTemplate("smartLogin", { email, password }))
    return res.json({ name: user ? user.name : "", tel: user ? user.tel : "", newUser: !!user })
  })

  app.post(registerUrl, bruteforce.prevent, async function response(req, res) {
    mongo
      .insertUser(req.body)
      .then(function (data) {
        mailer.send(createTemplate("confirmEmail", data))
        res.send("ok")
      })
      .catch(function (err) {
        res.status(500)
        res.send(err.message)
      })
  })

  app.post(loginUrl, bruteforce.prevent, async function response(req, res) {
    mongo
      .loginUser(req.body)
      .then(({ _id, email }) => {
        req.session.userId = _id
        req.session.email = email
        res.send("ok")
      })
      .catch(err => {
        res.status(500)
        res.send(err.message)
      })
  })

  app.post(adminLoginUrl, bruteforce.prevent, async function response(req, res) {
    const { email, password } = req.body
    const { adminUsers } = await mongo.getPublicDb()
    const adminUser = adminUsers.find(c => c.id === email)
    if (adminUser && oneTimeAdminCodes[adminUser.id] === password) {
      delete oneTimeAdminCodes[adminUser.id]
      req.session.userId = adminUser.id
      req.session.isAdmin = true
      req.session.adminLevel = adminUser.adminLevel
      res.cookie("users", adminUser.permissions.centers.join("|"), {
        expires: new Date(253402300000000),
      })
      res.send("ok")
    } else {
      req.session.isAdmin = false
      res.status(500)
      res.send("anonymous")
    }
  })

  app.post("/api/login/smart-admin-login", bruteforce.prevent, async function response(req, res) {
    const { userId = "" } = req.body
    const { adminUsers } = await mongo.getPublicDb()
    const adminUser = adminUsers.find(c => c.id === userId)
    if (!adminUser) {
      res.status(500)
      res.send("error")
      return
    }
    const password = Math.floor(100000 + Math.random() * 900000).toString()
    const email = isDeveloping ? "massi.cattaneo.it@gmail.com" : adminUser.otp
    mailer.send(createTemplate("adminLogin", { email, password, adminUser }))
    oneTimeAdminCodes[adminUser.id] = password
  })

  app.post(logoutUrl, bruteforce.prevent, function (req, res) {
    if (req.session) {
      // delete session object
      req.session.destroy(function (err) {
        if (err) {
          res.status(500)
          return res.send("error")
        } else {
          res.clearCookie("connect.sid")
          res.clearCookie("users")
          return res.send("ok")
        }
      })
    }
  })

  app.post(deleteAccountUrl, requiresLogin, function (req, res) {
    if (req.session) {
      mongo
        .deleteUser({ userId: req.session.userId })
        .then(function () {
          req.session.destroy(function (err) {
            if (err) {
              res.status(500)
              return res.send("error")
            } else {
              return res.send("ok")
            }
          })
        })
        .catch(function (err) {
          res.status(500)
          res.send(err.message)
        })
    }
  })
  app.post("/api/login/update-user-info", requiresLogin, function (req, res) {
    if (req.session) {
      mongo.rest.update("users", req.session.userId, req.body)
      return res.send("ok")
    }
    res.status(500)
    res.json({})
  })
}
