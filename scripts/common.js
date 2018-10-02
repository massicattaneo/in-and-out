require('../modules/gml-polyfills/String');
require('../modules/gml-polyfills/Date');
const { day_0, day_1, day_2, day_3, day_4, day_5, day_6 } = require('../src/localization/globalize/es.json');
const { month_0, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11 } = require('../src/localization/globalize/es.json');
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

module.exports = { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial, convertNumber };
