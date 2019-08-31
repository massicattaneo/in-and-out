export default async function ({ system, wait }) {
    const { newsletter } = this;
    try {
        const req = RetryRequest('/api/login/newsletter', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const res = await req.post(JSON.stringify({ newsletter }));
        if (res.responseText !== 'ok') {
            system.throw('error')
        }
    } catch (e) {
        system.throw(e.responseText)
    }
}
