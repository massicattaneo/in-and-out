export default async function ({ system, wait }) {
    try {
        const res = await RetryRequest('/api/reviews', { headers: { 'Content-Type': 'application/json' } })
            .post(JSON.stringify(this));
        return (JSON.parse(res.responseText))
    } catch(e) {
        system.throw('generic', e.responseText);
    }
}