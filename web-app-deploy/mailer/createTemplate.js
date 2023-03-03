const { host, greenColor, grayColor, confirmRegistrationUrl, changePasswordUrl } = require('../serverInfo');
const footer = require('./footer.js');
const header = require('./header.js');
const newsletter = require('./templates/newsletter');
const customEmail = require('./templates/customEmail');
const recover = require('./templates/recover');
const confirm = require('./templates/confirm');
const orderConfirm = require('./templates/orderConfirm');
const googleReview = require('./templates/googleReview');
const privacy = require('./templates/privacy');
const bookReminder = require('./templates/bookReminder');
const smartLogin = require('./templates/smartLogin');
const adminLogin = require('./templates/adminLogin');
const dayBill = require('./templates/dayBill');

module.exports = function (type, emailParams) {
    const email = emailParams.email;
    const encodedEmail = Buffer.from(email || "", "ascii").toString("base64")
    const params = Object.assign({}, emailParams,
        {
            host,
            greenColor,
            encodedEmail,
            grayColor, confirmRegistrationUrl, changePasswordUrl, footer, header
        });
    switch (type) {
    case 'orderConfirmedEmail':
        return {
            to: email, // list of receivers
            subject: 'Tu orden en In&Out', // Subject line
            text: '', // plain text body
            html: orderConfirm(params)
        };
    case 'confirmEmail':
        return {
            to: email, // list of receivers
            subject: 'Bienvenido en In&Out', // Subject line
            text: '', // plain text body
            html: confirm(params)
        };
    case 'recoverEmail':
        return {
            to: email, // list of receivers
            subject: 'Crea la contraseña de tu cuenta In&Out', // Subject line
            text: '', // plain text body
            html: recover(params)
        };
    case 'newsLetterEmail':
        return {
            to: email, // list of receivers
            subject: emailParams.subject, // Subject line
            text: '', // plain text body
            html: newsletter(params)
        };
    case 'customEmail':
        return {
            to: email, // list of receivers
            subject: emailParams.subject, // Subject line
            text: '', // plain text body
            html: customEmail(params)
        };
    case 'googleReview':
        return {
            to: emailParams.email,
            subject: '¿COMO LO HICIMOS?', // Subject line
            text: '', // plain text body
            html: googleReview(params)
        };
    case 'privacyEmail':
        return {
            to: emailParams.email,
            subject: 'Cláusula Informativa y la Política de cookies', // Subject line
            text: '', // plain text body
            html: privacy(params)
        };
    case 'bookReminder':
        return {
            to: emailParams.email,
            subject: 'Recordatorio cita con In&Out', // Subject line
            text: '', // plain text body
            html: bookReminder(params),
            attachments: emailParams.attachments
        };
    case 'smartLogin':
        return {
            to: emailParams.email,
            subject: 'Tu codigo de seguridad', // Subject line
            text: '', // plain text body
            html: smartLogin(params)
        };
    case 'adminLogin':
        return {
            to: emailParams.email,
            subject: 'Accesso a In&Out', // Subject line
            text: '', // plain text body
            html: adminLogin(params)
        };
    case 'dayBill':
        return {
            to: emailParams.email,
            subject: 'La factura de tu compra',
            text: '', // plain text body
            html: dayBill(params)
        };
    }
};
