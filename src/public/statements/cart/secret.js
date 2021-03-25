export default async function ({ system, wait }) {
    const { cart, email, sendTo } = this;
    try {
        const res = await RetryRequest('/api/stripe/secret', { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify({ cart, email, sendTo }));
        return JSON.parse(res.responseText);
    } catch(e) {
        system.throw('cart-pay', e.responseText);
    }
}
