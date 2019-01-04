const { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial } = require('./common');
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const fs = require('fs');
const path = require('path');

module.exports = async function (db, google, { title }) {
    const bills = await db.collection('bills').find().toArray();
    const cash = await db.collection('cash').find().toArray();
    const orders = await db.collection('orders').find().toArray();
    const bonus = await db.collection('bonus').find().toArray();
    const users = await db.collection('users').find().toArray();

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, title);

    /* generate buffer */
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(path.resolve(__dirname, './somario_facturas_de_compra.xlsx'), buf);

};
