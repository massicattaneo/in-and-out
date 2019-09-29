String.prototype.padLeft = function (size, char) {
    if (size === 0) {
        return '';
    }
    return (Array(size + 1).join(char) + this).slice(-size);
};
Date.prototype.formatDay = function (pattern, dayNames = [], monthnames = []) {
    pattern = pattern.replace(/dddd/g, dayNames[this.getDay()]);
    pattern = pattern.replace(/dd/g, this.getDate().toString().padLeft(2, 0));
    pattern = pattern.replace(/mmm/g, monthnames[this.getMonth()]);
    pattern = pattern.replace(/mm/g, (this.getMonth() + 1).toString().padLeft(2, 0));
    pattern = pattern.replace(/yyyy/g, this.getFullYear().toString());
    pattern = pattern.replace(/yy/g, this.getFullYear().toString().substr(2, 2));
    return pattern;
};

Date.prototype.formatTime = function (pattern) {
    pattern = pattern.replace(/hh/g, this.getHours().toString().padLeft(2, 0));
    pattern = pattern.replace(/mm/g, this.getMinutes().toString().padLeft(2, 0));
    pattern = pattern.replace(/ss/g, this.getSeconds().toString().padLeft(2, 0));
    return pattern;
};
const { day_0, day_1, day_2, day_3, day_4, day_5, day_6 } = require('../static/localization/globalize/es.json');
const { month_0, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11 } = require('../static/localization/globalize/es.json');
const dayNames = [day_0, day_1, day_2, day_3, day_4, day_5, day_6];
const monthNames = [month_0, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11];

function toCurrency(number = '0', currency = 'Euro') {
    return Number(Number(number).toFixed(2));
}

function net(value, IVA = 21) {
    return value / ((100 + IVA) / 100);
}

function getTotals(value, IVA = 21) {
    return {
        'BASE IMPONIBLE': toCurrency(net(value, IVA)),
        'PORCENTAJE IVA': `${IVA}%`,
        'IVA': toCurrency(value - net(value, IVA)),
        TOTAL: toCurrency(value)
    };
}

function convertNumber(s) {
    const string = s.toString();
    if (string.indexOf(',') !== -1 && string.indexOf('.') !== -1) {
        if (string.indexOf(',') >= string.indexOf('.')) return Number(string.replace('.', '').replace(',', '.'));
        if (string.indexOf('.') >= string.indexOf(',')) return Number(string.replace(/[^0-9\.-]+/g, ''));
    } else if (string.indexOf(',') !== -1) {
        return Number(string.replace(',', '.'));
    }
    return Number(string);
}

const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));

function getClientPrinting({ nif = '', cap = '', address = '', name = '', surname = '', city = '' }) {
    return `${surname ? `${surname.trim() }`: ''}${name.trim()}${nif ? `\nNIF: ${nif}`: ''}\n${address}\n${cap ? `${cap} - `: ''}${city}`;
}

function formatItemForPdfBill(entries, billNumber, date, client) {
    return Object.assign({
        '': '',
        NUMERO: billNumber,
        CENTRO: entries[0].user.toUpperCase(),
        TIPO: entries[0].type.toUpperCase(),
        FECHA: date,
        CLIENTE: (client && (client.name || client.surname)) ? getClientPrinting(client) : 'SIN CONTACTO',
        DESCRIPCIONES: entries.map(i => Object.assign({
            DESCRIPCION: i.description
        }, getTotals(i.amount)))
    }, getTotals(entries.reduce((tot, i) => tot + Number(i.amount), 0)));
}

function formatDateShort(date) {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

module.exports = {
    dayNames,
    monthNames,
    toCurrency,
    net,
    getTotals,
    promiseSerial,
    convertNumber,
    formatItemForPdfBill,
    formatDateShort
};
