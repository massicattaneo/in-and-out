export default async function ({ system, wait }) {
    try {
        const req = RetryRequest('/api/login/delete', { headers: { 'Content-Type': 'application/json' } });
        const res = await req.post(JSON.stringify(Object.assign({} , this, { email: this.email.toLowerCase() })));
        if (res.responseText !== 'ok') system.throw('generic-error');
    } catch (e) {
        system.throw(e.responseText);
    }
}