export default async function ({ system, wait }) {
    const {hasDateChanged, date} = this;
    if (hasDateChanged) {
        const req = RetryRequest('/google/free-busy', { timeout: 10000,headers: { 'Content-Type': 'application/json' } });
        const body = JSON.stringify({ timestamp: new Date(date).toISOString(), calendars: [0, 1, 2, 3, 4, 5] });
        try {
            return JSON.parse((await req.post(body)).responseText);
        } catch(e) {
            system.throw('booking-retrieve', e.responseText)
        }
    }
    return {};
}