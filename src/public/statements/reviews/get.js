export default async function ({ system, wait }) {
    try {
        const res = await RetryRequest(`/api/reviews/${this.counter}`, { headers: { 'Content-Type': 'application/json' } })
            .get();
        return (JSON.parse(res.responseText))
    } catch(e) {
        system.throw('generic', e.responseText);
    }
}