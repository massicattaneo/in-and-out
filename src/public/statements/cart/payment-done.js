export default async function ({ system, wait }) {
    const { email, cart, orderId, paymentIntent } = this;
    try {
        const res = await RetryRequest('/api/stripe/payment-done', { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify({ email, cart, orderId, paymentIntent, privacy: system.info().status.privacy }));
        system.info().status.privacy = true;
        return JSON.parse(res.responseText);
    } catch(e) {
        system.throw('cart-pay', e.responseText);
    }
}
