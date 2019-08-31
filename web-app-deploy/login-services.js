const createTemplate = require('./mailer/createTemplate');
const {
    confirmRegistrationUrl, registerUrl, loginUrl, adminLoginUrl,
    logoutUrl, logAdminStatus, logStatusUrl, recoverUrl,
    resetUrl, deleteAccountUrl, privacyEmailUrl,
    privacyAcceptUrl, newsletterUrl
} = require('./serverInfo');
const ObjectId = require('mongodb').ObjectID;
const adminKeys = require('./private/adminKeys.json');

function getObjectId(id) {
    try {
        return new ObjectId(id);
    } catch (e) {
        return e;
    }
}

module.exports = function ({
                               app, mongo, google, mailer,
                               bruteforce, requiresLogin, requiresAdmin
                           }) {

    app.get(logStatusUrl,
        requiresLogin,
        async function (req, res) {
            const userId = req.session.userId;
            const { email, anonymous, _id, privacy, newsletter = true } = await mongo.getUser({ _id: getObjectId(userId) });
            if (anonymous) {
                res.send({});
            } else {
                const data = {
                    id: _id,
                    favourites: await mongo.getUserData(userId),
                    hasBonusCards: (await mongo.rest.get('bonus', `clientId=${userId}`)).length > 0,
                    bookings: await google.getBookings(email),
                    privacy,
                    newsletter
                };
                Object.assign(data, { logged: true, email: req.session.email });
                res.send(data);
            }
        });

    app.get(logAdminStatus,
        requiresAdmin,
        async function (req, res) {
            res.send({ logged: true, adminLevel: req.session.adminLevel });
        });

    app.post(newsletterUrl,
        requiresLogin,
        async function (req, res) {
            mongo.rest.update('users', req.session.userId, {
                newsletter: req.body.newsletter
            });
            res.send('ok');
        });

    app.get(confirmRegistrationUrl,
        async function response(req, res) {
            mongo.activateUser(req.query.activationCode).then(async function () {
                const { lang } = await mongo.getUser({ activationCode: req.query.activationCode });
                const url = lang === 'es' ? '/es/cuenta/confirmacion' : '/';
                res.redirect(url);
            }).catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
        }
    );

    app.post(privacyEmailUrl, function (req, res) {
        mongo.recoverPassword({ email: req.body.email })
            .then(function (user) {
                mailer.send(createTemplate('privacyEmail', user));
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(recoverUrl, function (req, res) {
        mongo.recoverPassword({ email: req.body.email })
            .then(function (user) {
                mailer.send(createTemplate('recoverEmail', user));
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(privacyAcceptUrl, function (req, res) {
        mongo.privacyAccept(req.body)
            .then(function () {
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(resetUrl, function (req, res) {
        mongo.resetPassword(req.body)
            .then(function () {
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(registerUrl,
        bruteforce.prevent,
        async function response(req, res) {
            mongo.insertUser(req.body)
                .then(function (data) {
                    mailer.send(createTemplate('confirmEmail', data));
                    res.send('ok');
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post(loginUrl,
        bruteforce.prevent,
        async function response(req, res) {
            mongo.loginUser(req.body)
                .then(({ _id, email }) => {
                    req.session.userId = _id;
                    req.session.email = email;
                    res.send('ok');
                })
                .catch(err => {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post(adminLoginUrl,
        bruteforce.prevent,
        async function response(req, res) {
            if (req.body.password === adminKeys.salitre) {
                req.session.userId = 'salitre';
                req.session.isAdmin = true;
                req.session.adminLevel = 0;
                res.cookie('users', 'salitre', { expires: new Date(253402300000000) });
                res.send('ok');
            } else if (req.body.password === adminKeys.buenaventura) {
                req.session.userId = 'buenaventura';
                req.session.isAdmin = true;
                req.session.adminLevel = 0;
                res.cookie('users', 'buenaventura', { expires: new Date(253402300000000) });
                res.send('ok');
            }
            // else if (req.body.password === adminKeys.carmen_v) {
            //     req.session.userId = 'carmen_v';
            //     req.session.isAdmin = true;
            //     req.session.adminLevel = 1;
            //     res.cookie('users', 'salitre|compania|buenaventura', { expires: new Date(253402300000000) });
            //     res.send('ok');
            // }
            else if (req.body.password === adminKeys.carmen) {
                req.session.userId = 'carmen';
                req.session.isAdmin = true;
                req.session.adminLevel = 2;
                res.cookie('users', 'salitre|compania|buenaventura', { expires: new Date(253402300000000) });
                res.send('ok');
            } else {
                req.session.isAdmin = false;
                res.status(500);
                res.send('anonymous');
            }
        });

    app.post(logoutUrl,
        requiresLogin,
        function (req, res) {
            if (req.session) {
                // delete session object
                req.session.destroy(function (err) {
                    if (err) {
                        res.status(500);
                        return res.send('error');
                    } else {
                        return res.redirect('/');
                    }
                });
            }
        });

    app.post(deleteAccountUrl,
        requiresLogin,
        function (req, res) {
            if (req.session) {
                mongo.deleteUser({
                    userId: req.session.userId,
                    password: req.body.password
                }).then(function () {
                    req.session.destroy(function (err) {
                        if (err) {
                            res.status(500);
                            return res.send('error');
                        } else {
                            return res.send('ok');
                        }
                    });
                }).catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
            }
        });
};
