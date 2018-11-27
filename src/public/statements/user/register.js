export default async function ({ system, wait }) {
    try {
        const req = RetryRequest('/api/login/register', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const res  = await req.post(JSON.stringify(Object.assign({} , this, { email: this.email.toLowerCase(), privacy: true })));
        if (res.responseText === 'exist') {
            system.throw('exist');
        }
    } catch (e) {
        system.throw(e.responseText)
    }
}
