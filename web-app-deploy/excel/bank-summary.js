const { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial } = require('../pdf/common');
const XLSX = require('xlsx');
const types = {
    tpv: {
        filter: b => b.key === '143',
        label: 'TPV'
    },
    cash: {
        filter: b => b.key === '009',
        label: 'EFECTIVO'
    },
    online: {
        filter: b => b.key === '163',
        label: 'ONLINE'
    },
    customers: {
        filter: b => b.key === '007' && ['ESTEFANIA', 'VELA', 'FERRETE', 'CRISTINA', 'EILA', 'NÓMINA', 'VANESA', 'KHURTSIDZE']
            .find(s => b.note.toUpperCase().includes(s)),
        label: 'NOMINAS'
    },
    car: {
        filter: b => b.key === '007' && b.amount === -426.46,
        label: 'COCHE'
    },
    rents: {
        filter: b => b.key === '007' && ['PIEDAD', 'ALQUILER', 'LOCAL'].find(s => b.note.toUpperCase().includes(s))
            && new Date(b.valueDate).getTime() < new Date('2018-09-30').getTime(),
        label: 'ALQUILER'
    },
    bank: {
        filter: b => b.key === '039' || b.key === '022',
        label: 'BANCO'
    },
    web: {
        filter: b => ['EVENNODE', 'DONDOMINIO', 'FACEBK', 'EXEGESIS'].find(s => b.note.toUpperCase().includes(s)),
        label: 'SERVICIOS WEB'
    },
    tax: {
        filter: b => b.key === '326' || b.key === '521',
        label: 'TRIBUTOS'
    },
    kramon: {
        filter: b => ['NUEVA VENTURA', 'KRAMON', 'MONTIEL'].find(s => b.note.toUpperCase().includes(s)),
        label: 'OBRA LOCAL'
    },
    security: {
        filter: b => ['TYCO'].find(s => b.note.toUpperCase().includes(s)),
        label: 'SEGURIDAD'
    },
    insurance: {
        filter: b => ['SEGUROS'].find(s => b.note.toUpperCase().includes(s)),
        label: 'SEGUROS'
    },
    burocracy: {
        filter: b => ['ANTONIO PARRA'].find(s => b.note.toUpperCase().includes(s)),
        label: 'GESTORIA'
    }
};

function getType(b) {
    const res = Object.keys(types).filter(type => types[type].filter(b));
    return res.length ? res.map(type => types[type].label).join(',') : '';
}

module.exports = async function (db, google, { from, to, title }) {
    const wb = XLSX.utils.book_new();

    const bills = (await db.collection('bills').find().toArray())
        .filter(a => new Date(a.date).getTime() > from)
        .filter(a => new Date(a.date).getTime() < to);

    const bank = (await db.collection('bank').find().toArray())
        .filter(a => new Date(a.valueDate).getTime() > from)
        .filter(a => new Date(a.valueDate).getTime() < to);

    const avoidedTypes = ['BANCO', 'COCHE', 'EFECTIVO'];
    const data = [];
    await promiseSerial(bank
        .sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime())
        .map(i => {
            return async () => {
                const type = getType(i);
                data.push({
                    DATA: new Date(i.valueDate).formatDay('dddd, dd mmm yyyy', dayNames, monthNames),
                    CLAVE: i.key,
                    DESCRIPCION: `${i.description.trim()} - ${i.note.trim()}`,
                    CUENTA_PRINCIPAL: i.account === 'main' ? toCurrency(i.amount) : 0,
                    CUENTA_IVA: i.account === 'iva' ? toCurrency(i.amount) : 0,
                    TIPO: type,
                    FACTURA: bills.filter(b => avoidedTypes.indexOf(type) == -1 && b.type === 'tarjeta' && b.amount === -i.amount).map(b => b.emitter.company).join(',')
                });
            };
        }));

    data.push({ DESCRIPCION: '' });
    data.push({ DESCRIPCION: '' });
    data.push({ DESCRIPCION: '' });

    Object.keys(types).forEach(function (type) {
        data.push({
            DESCRIPCION: `TOTAL ${types[type].label}`,
            CUENTA_PRINCIPAL: toCurrency(bank.filter(types[type].filter).reduce((a, b) => a + b.amount, 0))
        });
    });

    data.push({
        DESCRIPCION: `TOTAL FACTURAS`,
        CUENTA_PRINCIPAL: -toCurrency(bills.reduce((a, b) => a + b.amount, 0))
    });

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, title);

    /* generate buffer */
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buf;
};
