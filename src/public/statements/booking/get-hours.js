export default async function ({ system, wait }) {
    const {date, treatments, center} = this;
    const req = RetryRequest('/google/get-hours', { timeout: 10000,headers: { 'Content-Type': 'application/json' } });
    const body = JSON.stringify({date: new Date(date).toISOString(), treatments, center});
    try {
        return JSON.parse((await req.post(body)).responseText);
    } catch(e) {
        system.throw('booking-retrieve', 'anonymous')
    }
    return {};
}