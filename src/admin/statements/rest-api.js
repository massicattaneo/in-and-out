export default async function({ system, wait }) {
    try {
        system.loading = true;
        const context = this;
        const { api, method } = context;
        delete context.api;
        delete context.method;
        delete context.actualStatement;
        const req = RetryRequest(`/api/rest/${api}`, { timeout: 10000, headers: { 'Content-Type': 'application/json' } });

        const res = await req.send(method, JSON.stringify(this));
        if (res && res.responseText){
            return JSON.parse(res.responseText);
        }
    } catch (e) {
        system.throw(e.responseText);
    } finally {
        system.loading = false;
    }
}