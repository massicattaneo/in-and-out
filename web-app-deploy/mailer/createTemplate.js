const { host, greenColor, grayColor, confirmRegistrationUrl, changePasswordUrl } = require('../serverInfo');
const footer = require('./footer.js');
const header = require('./header.js');
const newsletter = require('./templates/newsletter');
const recover = require('./templates/recover');
const confirm = require('./templates/confirm');
const orderConfirm = require('./templates/orderConfirm');
const googleReview = require('./templates/googleReview');
const privacy = require('./templates/privacy');

module.exports = function (type, emailParams) {
    const email = emailParams.email;
    const params = Object.assign({}, emailParams,
        { host, greenColor, grayColor, confirmRegistrationUrl, changePasswordUrl, footer, header });
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
            bcc: emailParams.bcc,
            subject: emailParams.subject, // Subject line
            text: '', // plain text body
            html: newsletter(Object.assign({ bodyTitle: emailParams.subject }, params))
        };
    case 'googleReview':
        return {
            to: emailParams.email,
            bcc: emailParams.bcc,
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
    }
};
