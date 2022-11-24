const PdfDoc = require('pdfkit');
const path = require('path');
const parseCart = require('./parseCart');
const info = require('../serverInfo.json');
const { activePromotions, getDiscountsPrice, getPromotionDiscounts } = require('../shared');

module.exports = function createPdfOrder(res, googleDb, code, cart) {
    const activePromo = activePromotions(googleDb.promotions, 1)[0];
    const doc = new PdfDoc({
        margins: {
            bottom: 0
        }
    });
    doc.pipe(res);
    const products = parseCart(cart, googleDb);

    doc.registerFont('burst', path.resolve(`${__dirname}/../static/assets/fonts/burst-my-bubble/burstmybubble.ttf`));
    doc.registerFont('burst-bold', path.resolve(`${__dirname}/../static/assets/fonts/burst-my-bubble/burstmybubblebold.ttf`));

    doc
        .image(path.resolve(`${__dirname}/../static/assets/images/pdf-buy-background.png`), 0, 0, { width: 615 });

    const salitre = googleDb.centers[0];
    const buenaventura = googleDb.centers[2];
    const marginLeft = 40;

    doc
        .fontSize(50)
        .fillColor(info.greenColor)
        .font('burst-bold')
        .text('ALGO ESPECIAL', marginLeft + 100, 25)
        .text('TE ESPERA!', marginLeft + 100, 85)
        .fillColor('black');

    doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text(`${salitre.address}`, marginLeft, 160)
        .text(`${buenaventura.address}`, 245, 160)
        .fontSize(9)
        .font('Helvetica')
        .text(`TEL: ${salitre.tel}, MOV: ${salitre.mobile}`, marginLeft, 170)
        .text(`TEL: ${buenaventura.tel}, MOV: ${buenaventura.mobile}`, 245, 170)
        .text(`HORARIO:`, marginLeft, 185)
        .text(`HORARIO:`, 245, 185)
        .text(`lunes-viernes 10:00-20:00 h.`, 90, 185)
        .text(`lunes-viernes 10:00-19:00 h.`, 295, 185)
        .text(`sabado 10:00-14:00 h.`, 90, 195)
        .text(`sabado CERRADO`, 295, 195)
        .text(`1 hora de parking GRATIS *`, marginLeft + 420, 210);

    doc.text(`(*) 1 hora de parking gratis a partir de 30€`, marginLeft, 690);

    let y = 250;
    doc.font('burst');
    if (products.filter(i => i.type !== 'products').length) {
        doc
            .fontSize(14)
            .fillColor('black')
            .text(`Ya puedes disfrutar de los tratamientos de In&Out!!!`, marginLeft, y);
        y += 15;
        doc
            .fontSize(12)
            .fillColor('black')
            .text(`Pide cita en uno de nuestros centros.`, marginLeft, y);

        y += 15;
    } else {
        doc
            .fontSize(14)
            .fillColor('black')
            .text(`Hola! Aqui tiene el codigo de compra de tu productos In&Out!!!`, marginLeft, y);

        y += 15;
    }

    doc
        .image(path.resolve(`${__dirname}/../order-qr-codes/${code}.png`), 470, 300, { width: 100 });

    const left = marginLeft;

    if (products.filter(i => i.type !== 'products').length) {
        y += 15;

        doc
            .lineWidth(30)
            .lineCap('butt')
            .strokeColor('#FFECD1')
            .moveTo(marginLeft, y + 7)
            .lineTo(470, y + 7)
            .stroke();
        doc
            .fontSize(20)
            .font('burst-bold')
            .text('Esto es lo que te espera:', marginLeft + 10, y);

        y += 25;

        doc.fontSize(14);
        doc.font('Helvetica');

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
            .lineTo(470, y + 5)
            .stroke();

        doc.font('burst-bold')
        if (products.filter(i => i.type !== 'products').length) {
            doc.text('Ademas te enviaremos:', left, y);
        } else {
            doc.text('Te enviaremos:', left, y);
        }

        y += 15;

        doc.fontSize(14);
        doc.font('Helvetica');
        products
            .filter(i => i.type === 'products')
            .forEach(function ({ count, price, type, title }) {
                y += 15;
                doc.text(`${count} x ${title}`, left, y);
            });
    }

    if (activePromo) {
        doc.font('burst');
        const discounts = getPromotionDiscounts(activePromo);
        doc
            .fontSize(20)
            .font('burst-bold')
            .text('Y ADEMAS NO PERDERTE:', 260, 700)
            .fontSize(12)
            .font('burst')
            .text(`${activePromo.titulo}`, 260, 720, { width: 300 })
            .fontSize(16)
            .font('burst-bold')
            .text(`POR SOLO ${getDiscountsPrice(googleDb, discounts)}€`, 260, doc.y + 5);
    }

    doc.end();
};
