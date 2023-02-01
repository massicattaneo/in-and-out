export default async function ({ system, wait }) {
    const { email, password, lang } = this;
    try {
        const req = RetryRequest('/api/login/login', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const res = await req.post(JSON.stringify({ email: email.toLowerCase(), password, lang }));
        
        if (res.responseText !== 'ok') {
            system.throw('error')
        }
    } catch (e) {
        system.throw(e.responseText)
    }
}