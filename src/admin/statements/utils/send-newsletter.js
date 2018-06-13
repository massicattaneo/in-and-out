export default async function ({ system, wait }) {
    try {
        const { test = true, emails, subject, html } = this;
        const req = RetryRequest('/api/newsletter', { headers: { 'Content-Type': 'application/json' } });
        const res = await req.post(JSON.stringify({ test, emails, subject, html }));
        if (res.responseText !== 'ok') system.throw('generic-error');
    } catch (e) {
        system.throw(e.responseText);
    }
}