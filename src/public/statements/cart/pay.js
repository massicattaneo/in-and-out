export default async function ({ system, wait }) {
    const {token, cart, email, sendTo, lang} = this;
    try {
        const res = await RetryRequest('/api/stripe/pay', { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify({ token, cart, email, sendTo, privacy: system.info().status.privacy, lang }));
        system.info().status.privacy = true;
        return JSON.parse(res.responseText);
    } catch(e) {
        system.throw('cart-pay', e.responseText);
    }
}
