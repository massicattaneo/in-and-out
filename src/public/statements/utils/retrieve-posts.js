export default async function ({ system, wait }) {
    const { post } = this;
    const req = RetryRequest(`/api/posts/${post}`, {headers: {'Content-Type': 'application/json'}});
    const res = await req.get();
    return JSON.parse(res.responseText);
}