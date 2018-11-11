const stripeConfig = require("./private/stripe.json");
const isDeveloping = process.env.NODE_ENV === "development";
const stripe = require("stripe")(isDeveloping ? stripeConfig.devServerKey : stripeConfig.liveServerKey);

module.exports = function() {
    const obj = {};

    obj.pay = function({ token, amount, orderId, cart = [], email }) {
        return new Promise(function(resolve, reject) {
            stripe.charges.create({
                amount,
                currency: "eur",
                description: `Order id: ${orderId}`,
                // statement_descriptor: "Custom descriptor",
                metadata: { orderId: `${orderId}`, email, cart: JSON.stringify(cart) },
                source: token,
            }, function(err, charge) {
                if (err) {
                    return reject(new Error('stripe-error'));
                }
                resolve(charge);
            });
        })
    };

    return obj;
};
