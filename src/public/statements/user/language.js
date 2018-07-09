export default async function ({ system, wait }) {
    if (system.store.logged) {
        const req = RetryRequest('/api/language', { headers: { 'Content-Type': 'application/json' } });
        req.post(JSON.stringify(this));
    }
}