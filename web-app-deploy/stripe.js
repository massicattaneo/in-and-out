const stripeConfig = require('./private/stripe.json');
const isDeveloping = process.env.NODE_ENV === 'development';
const stripe = require('stripe')(isDeveloping ? stripeConfig.devServerKey : stripeConfig.liveServerKey);

module.exports = function () {
    const obj = {};

    obj.clientSecret = function ({ amount }) {
        return new Promise(async (resolve, reject) => {
            stripe.paymentIntents
                .create({
                    amount,
                    currency: 'eur',
                    metadata: { integration_check: 'accept_a_payment' }
                })
                .catch((err) => {
                    reject(new Error('stripe-error'));
                })
                .then(intent => {
                    resolve({ clientSecret: intent.client_secret });
                });
        });
    };

    return obj;
};
