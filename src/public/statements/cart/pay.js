export default async function ({ system, wait }) {
    const {token, cart, email} = this;
    try {
        const res = await RetryRequest('/api/stripe/pay', { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify({ token, cart, email }));
        return JSON.parse(res.responseText);
    } catch(e) {
        system.throw('cart-pay', e.responseText);
    }
}