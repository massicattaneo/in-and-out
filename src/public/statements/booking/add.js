export default async function ({ system, wait }) {
    try {
        const req = RetryRequest('/google/calendar/add', { timeout: 10000,headers: { 'Content-Type': 'application/json' } });
        await req.post(JSON.stringify(this))
    } catch(e) {
        system.throw('booking-delete', e.responseText)
    }
    return {};
}