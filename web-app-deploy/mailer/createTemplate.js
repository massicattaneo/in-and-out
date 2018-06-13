const { host, greenColor, grayColor, confirmRegistrationUrl, changePasswordUrl } = require('../serverInfo');
const footer = require('./footer.js');
const newsletter = require('./templates/newsletter');
const recover = require('./templates/recover');
const confirm = require('./templates/confirm');
const orderConfirm = require('./templates/orderConfirm');

module.exports = function (type, emailParams) {
    const email = emailParams.email;
    const params = Object.assign({}, emailParams,
        { host, greenColor, grayColor, confirmRegistrationUrl, changePasswordUrl, footer });
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
                subject: 'Cambia la contraseña de tu cuenta In&Out', // Subject line
                text: '', // plain text body
                html: recover(params)
            };
        case 'newsLetterEmail':
            return {
                bcc: emailParams.bcc,
                subject: emailParams.subject, // Subject line
                text: '', // plain text body
                html: newsletter(params)
            };
    }
};