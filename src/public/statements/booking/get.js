export default async function ({ system }) {
    const {date, calendarId} = this;

    const req = RetryRequest('/google/calendar/get', {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
    });
    const body = JSON.stringify({ timestamp: date.toISOString(), calendarId });
    try {
        const res = await req.post(body);
        return JSON.parse(res.responseText)
    } catch(e) {
        system.throw('generic', e.responseText)
    }
    return {};
}
