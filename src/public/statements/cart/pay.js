export default async function ({ system, wait }) {
    const {token, cart, email, sendTo} = this;
    try {
        const res = await RetryRequest('/api/stripe/pay', { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify({ token, cart, email, sendTo, privacy: system.info().status.privacy }));
        system.info().status.privacy = true;
        return JSON.parse(res.responseText);
    } catch(e) {
        system.throw('cart-pay', e.responseText);
    }
}
