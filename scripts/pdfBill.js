const create = require('../web-app-deploy/pdf/createPdfBill');
const path = require('path');
const fs = require('fs');

//1410340 salitre
//1502006 compania
//1600000 buenaventura

const file = fs.createWriteStream(path.resolve(__dirname, './bill.pdf'));
create(file, {
    '': '',
    NUMERO: '14',
    FECHA: '1-7-2018',
    CENTRO: 'SALITRE',
    TIPO: 'TARJETA',
    CLIENTE: 'SIN CONTACTO',
    DESCRIPCION: 'DESCRIPCION',
    'BASE IMPONIBLE': 'Euro 13,22',
    'PERCENTAGE': '21%',
    'IVA': 'Euro 3.78',
    TOTAL: 'Euro 16,00'
});
