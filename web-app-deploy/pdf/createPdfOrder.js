const PdfDoc = require('pdfkit');
const path = require('path');
const parseCart = require('./parseCart');
const info = require('../serverInfo.json');

module.exports = function createPdfOrder(res, googleDb, code, cart) {
    const doc = new PdfDoc();
    doc.pipe(res);
    const products = parseCart(cart, googleDb);

    doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('black')
        .text('IN', 40, 40)
        .fillColor('green')
        .text('&', 60, 40)
        .fillColor('black')
        .text('OUT', 74, 40);

    doc
        .fontSize(16)
        .font('Helvetica')
        .text('- Centro de belleza', 120, 43);

    doc
        .lineWidth(1)
        .lineCap('butt')
        .moveTo(40, 65)
        .lineTo(570, 65)
        .stroke();

        const salitre = googleDb.centers[0];
        const buenaventura = googleDb.centers[2];
        doc
            .fontSize(9)
            .fillColor('grey')
            .text(`${salitre.address} - tel: ${salitre.tel}, mov: ${salitre.mobile}`, 40, 75)
            .text(`${buenaventura.address} - tel: ${buenaventura.tel}, mov: ${buenaventura.mobile}`, 40, 90);

    let y = 130;

    if (products.filter(i => i.type !== 'products').length) {

        doc
            .fontSize(14)
            .fillColor('black')
            .text(`Hola! Ya puedes disfrutar de los tratamientos de In&Out!!!`, 40, y);

        y += 30;

        doc
            .fontSize(12)
            .fillColor('black')
            .text(`Pide cita en uno de nuestro centros con este codigo: (${code})`, 40, y);

        y += 30;
    } else {
        doc
            .fontSize(14)
            .fillColor('black')
            .text(`Hola! Aqui tiene el codigo de compra de tu productos In&Out!!!`, 40, y);

        y += 30;
    }

    doc
        .image(path.resolve(`${__dirname}/../order-qr-codes/${code}.png`), 25, y, { width: 130 });

    const left = 170;

    if (products.filter(i => i.type !== 'products').length) {
        y += 15;

        doc
            .lineWidth(15)
            .lineCap('butt')
            .strokeColor('#dddddd')
            .moveTo(left, y + 5)
            .lineTo(570, y + 5)
            .stroke();
        doc
            .text('Esto es lo que te espera en nuestros centros:', left, y);

        y += 15;

        products.filter(i => i.type !== 'products')
            .forEach(function ({ count, price, type, title, category }) {
                y += 15;
                doc.text(`${count} x ${category ? `${category}: ` : ''}${title}`, left, y);
            });

        y += 15;

    }

    if (products.filter(i => i.type === 'products').length) {

        y += 15;
        doc
            .lineWidth(15)
            .lineCap('butt')
            .strokeColor('#dddddd')
            .moveTo(left, y + 5)
            .lineTo(570, y + 5)
            .stroke();

        if (products.filter(i => i.type !== 'products').length) {
            doc.text('Ademas te enviaremos:', left, y);
        } else {
            doc.text('Te enviaremos:', left, y);
        }

        y += 15;

        products
            .filter(i => i.type === 'products')
            .forEach(function ({ count, price, type, title }) {
                y += 15;
                doc.text(`${count} x ${title}`, left, y);
            });
    }

    doc
        .image(path.resolve(`${__dirname}/../static/assets/images/slider-1.png`), 40, 500, { width: 530 });


    doc.end();
};
