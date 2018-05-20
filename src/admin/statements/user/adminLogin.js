export default async function ({ system, wait }) {
    const { email, password, lang } = this;
    try {
        const req = RetryRequest('/api/login/adminLogin', {
            timeout: 10000, headers: {
                'Content-Type': 'application/json'
            }
        });
        const res = await req.post(JSON.stringify({ email, password, lang }));
        if (res.responseText !== 'ok') {
            system.throw('error')
        }
    } catch (e) {
        console.log(e.responseText);
        system.throw(e.responseText)
    }
}