const { toCurrency, getTotals } = require('./common');
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const fs = require('fs');
const path = require('path');
const ObjectId = require('mongodb').ObjectID;
const parseCart = require('../web-app-deploy/pdf/parseCart');
const createPdfBills = require('../web-app-deploy/pdf/createPdfBills');

function resetObject(tots) {
    Object.keys(tots).forEach(function (key) {
        Object.keys(tots[key]).forEach(function (key2) {
            tots[key][key2] = 0;
        });
    });
}

function addTotals(subTotals, totals) {
    Object.keys(subTotals).forEach(function (key) {
        Object.keys(subTotals[key]).forEach(function (key2) {
            totals[key][key2] += subTotals[key][key2];
        });
    });
}

function createTotals() {
    return {
        salitre: { tarjeta: 0, efectivo: 0, expenses: 0, tpv: 0 },
        buenaventura: { tarjeta: 0, efectivo: 0, expenses: 0, tpv: 0 },
        online: { tarjeta: 0, efectivo: 0 }
    };
}

const billNumber = {
    salitre: { ref: '14', num: 15721 },
    compania: { ref: '15', num: 2006 },
    buenaventura: { ref: '16', num: 2138 },
    online: { ref: '17', num: 207 }
};

function getBillNumber(item) {
    if (item.amount < 0) return '';
    return `${billNumber[item.user].ref}${(++billNumber[item.user].num).toString().padLeft(6, '0')}`;
}

module.exports = async function (db, google, { from, to, maxCashAmount }) {
    const users = await db.collection('users').find().toArray();
    const bank = await db.collection('bank').find().toArray();
    const orders = (await db.collection('orders').find().toArray())
        .filter(o => o.payed === true)
        .filter(o => new Date(o.created).getTime() > new Date(from).getTime())
        .filter(o => new Date(o.created).getTime() < new Date(to).getTime())
        .map(o => {
            const products = parseCart(o.cart, google.publicDb());
            return {
                date: Math.max(new Date(o.created).getTime(), new Date('2018-07-02').getTime()),
                amount: o.amount / 100,
                clientId: o.userId || '',
                user: 'online',
                type: 'tarjeta',
                description: products
                    .map(({ count, price, type, title, category }) => `${count} x ${category ? `${category}: ` : ''}${title}`, '')
                    .join(' - ')
            };
        });

    const cash = await db.collection('cash').find().toArray();

    const subTotals = createTotals();
    const totals = createTotals();

    let ref = '30-7-2018';
    const data = [];
    const allData = [];
    const array = cash
        .concat(orders)
        .filter(item => item.date > from)
        .filter(item => item.date < to);

    /** REMOVE CASH */
    let subTot = 0;
    const oneDay = 24 * 60 * 60 * 1000;
    let lastDate = from - oneDay;
    const toAdd = array.filter(i => i.type === 'efectivo' && i.amount > 0);
    const others = array.filter(i => i.type !== 'efectivo' || i.amount < 0);
    while (toAdd.length && subTot < maxCashAmount) {
        for (let i = 0; i < toAdd.length; i++) {
            const date = new Date(toAdd[i].date);
            if (date > lastDate) {
                const item = toAdd.splice(i, 1)[0];
                subTot += item.amount;
                others.push(item);
                lastDate = new Date(date.getTime() + oneDay);
                if (lastDate.getTime() > (to - 2 * oneDay))
                    lastDate = from - oneDay;
                break;
            }
        }
    }

    const toPrint = others.sort((a, b) => a.date - b.date);
    const formatted = [];

    for (let index = 0; index <= toPrint.length; index++) {
        const item = toPrint[index] || {};
        const date = new Date(item.date);
        const fecha = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

        if (ref !== fecha) {
            data.push({ '': '' });
            data.push(Object.assign({ DESCRIPCION: 'SALITRE TARJETA' }, getTotals(subTotals.salitre.tarjeta)));
            data.push(Object.assign({ DESCRIPCION: 'SALITRE EFECTIVO' }, getTotals(subTotals.salitre.efectivo)));
            data.push(Object.assign({ DESCRIPCION: 'SALITRE GASTOS' }, getTotals(subTotals.salitre.expenses)));
            data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA TARJETA' }, getTotals(subTotals.buenaventura.tarjeta)));
            data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA EFECTIVO' }, getTotals(subTotals.buenaventura.efectivo)));
            data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA GASTOS' }, getTotals(subTotals.buenaventura.expenses)));
            data.push(Object.assign({ DESCRIPCION: 'ONLINE' }, getTotals(subTotals.online.tarjeta)));

            const date = new Date((new Date(ref.split('-').reverse().join('-'))).getTime() + 24 * 60 * 60 * 1000);

            const salitre = bank
                .filter(b => (b.note === 'COMERC334264736' || b.note === 'COMERC341540292' || b.note === 'COMERC 341540292')
                    && b.key === '143' && new Date(b.valueDate).getMonth() === date.getMonth() && new Date(b.valueDate).getDate() === date.getDate())
                .filter(i => i.amount > 0);
            const buenaventura = bank
                .filter(b => (b.note === 'COMERC334297272' || b.note === 'COMERC 334297272')
                    && b.key === '143' && new Date(b.valueDate).getMonth() === date.getMonth() && new Date(b.valueDate).getDate() === date.getDate())
                .filter(i => i.amount > 0);
            const tpvSalitre = salitre.reduce((t, i) => t + i.amount, 0) * (date.getTime() < (new Date('2018-08-02')).getTime() ? (100 / 98.5) : (100 / 99.6));
            totals.salitre.tpv += tpvSalitre;
            data.push({ DESCRIPCION: 'TPV SALITRE', TOTAL: toCurrency(tpvSalitre) });
            const tpvBuenaventura = buenaventura.reduce((t, i) => t + i.amount, 0);
            totals.buenaventura.tpv += tpvBuenaventura;
            data.push({ DESCRIPCION: 'TPV BUENAVENTURA', TOTAL: toCurrency(tpvBuenaventura) });
            data.push({ '': '' });

            if (Math.abs(tpvSalitre - subTotals.salitre.tarjeta) > 4) {
                console.log(ref, 'salitre', tpvSalitre, subTotals.salitre.tarjeta);
            }
            if (Math.abs(tpvBuenaventura - subTotals.buenaventura.tarjeta) > 4) {
                console.log(ref, 'buenaventura', tpvBuenaventura, subTotals.buenaventura.tarjeta);
            }

            addTotals(subTotals, totals);
            resetObject(subTotals);

            const sheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, sheet, ref);
            data.length = 0;
        }

        if (item.date) {
            const find = users.find(u => u._id.toString() === item.clientId.toString());
            ref = fecha;
            subTotals[item.user][item.amount > 0 ? item.type : 'expenses'] += item.amount;
            let itemFormatted = Object.assign({
                '': '',
                NUMERO: getBillNumber(item),
                CENTRO: item.user.toUpperCase(),
                TIPO: item.type.toUpperCase(),
                FECHA: fecha,
                CLIENTE: find ? `${find.surname || ''} ${find.name || ''}` : 'SIN CONTACTO',
                DESCRIPCION: item.description
            }, getTotals(item.amount));
            item.amount > 0 && formatted.push(itemFormatted);
            data.push(itemFormatted);
            allData.push(itemFormatted);
        }
    }

    data.push({ '': '' });
    data.push(Object.assign({ DESCRIPCION: 'SALITRE TARJETA' }, getTotals(totals.salitre.tarjeta)));
    data.push(Object.assign({ DESCRIPCION: 'SALITRE EFECTIVO' }, getTotals(totals.salitre.efectivo)));
    data.push(Object.assign({ DESCRIPCION: 'SALITRE GASTOS' }, getTotals(totals.salitre.expenses)));
    data.push({ '': '' });
    data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA TARJETA' }, getTotals(totals.buenaventura.tarjeta)));
    data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA EFECTIVO' }, getTotals(totals.buenaventura.efectivo)));
    data.push(Object.assign({ DESCRIPCION: 'BUENAVENTURA GASTOS' }, getTotals(totals.buenaventura.expenses)));
    data.push({ '': '' });
    data.push(Object.assign({ DESCRIPCION: 'ONLINE' }, getTotals(totals.online.tarjeta)));
    data.push(Object.assign({ DESCRIPCION: 'TPV SALITRE' }, getTotals(totals.salitre.tpv)));
    data.push(Object.assign({ DESCRIPCION: 'TPV BUENAVENTURA' }, getTotals(totals.buenaventura.tpv)));
    data.push({ '': '' });
    data.push({ '': 'PDF link' });

    const file = fs.createWriteStream(path.resolve(__dirname, './facturas_de_venta.pdf'));
    createPdfBills(file, formatted);

    const allSheet = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, allSheet, 'LISTADO COMPLETO');

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, 'TOTAL');

    /* generate buffer */
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await new Promise(res => setTimeout(res, 3000));

    fs.writeFileSync(path.resolve(__dirname, './somario_facturas_de_venta.xlsx'), buf);
    console.log(`BILLS NUMBERS FOR NEXT TRIMESTRAL:
        SALITRE:      ${billNumber.salitre.num + 1}
        BUENAVENTURA: ${billNumber.buenaventura.num + 1}
        ONLINE:       ${billNumber.online.num + 1}
    `);
};
