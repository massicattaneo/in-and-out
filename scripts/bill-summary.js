const { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial } = require('./common');
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const fs = require('fs');
const path = require('path');

module.exports = async function (db, google, { from, to }) {

    const bills = await db.collection('bills').find().toArray();

    const data = [];
    await promiseSerial(bills
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter(a => new Date(a.date).getTime() > from)
        .filter(a => new Date(a.date).getTime() < to)
        .map(i => {
            return async () => {
                const link = i.files[0] ? await google.shareFile(i.files[0].googleRef) : '';
                data.push(Object.assign({
                    DATA: new Date(i.date).formatDay('dddd, dd mmm yyyy', dayNames, monthNames),
                    EMISOR: i.emitter.company,
                    CIF: i.emitter.cif,
                    NUMERO: i.number,
                    PAGO: i.type === 'efectivo' ? 'EFECTIVO' : 'BANCO',
                    'DIRECCIÓN': i.emitter.address,
                    LINK: link
                }, getTotals(i.amount, i.iva)));
            };
        }));

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, 'IV Trimestre 2018');

    /* generate buffer */
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    fs.writeFileSync(path.resolve(__dirname, './bill-summary.xlsx'), buf);

};
