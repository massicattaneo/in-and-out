export default async function ({ system }) {
    try {
        const req = RetryRequest('/api/adminDb', {timeout: 10000, headers: {'Content-Type': 'application/json' }});
        return JSON.parse((await req.get()).responseText);
    } catch (e) {
        console.log(e.responseText);
        system.throw(e.responseText)
    }
}