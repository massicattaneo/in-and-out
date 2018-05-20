import txtImage from './image.html';

const IVA = 21;

export function printBills(startNumber = 1, expression, items, system) {
    var doc = new jspdf('p', 'mm', [297, 210]);
    // var cashIds = newTot(params.cashMaximum, Object.keys(transactionsData)
    // 	.map(function (k) {return transactionsData[k];})
    // 	.filter(params.filter));
    items.forEach(function(b, i) {
        i !== 0 && doc.addPage();
        doc.addImage(txtImage, 'JPEG', 5, 0, 90, 50);

        doc.rect(110, 15, 90, 30, 'S');
        doc.setFontSize(20);
        doc.setFontStyle('bold');
        doc.text('FACTURA', 120, 25);
        doc.setFontStyle('italic');
        doc.setFontSize(8);
        doc.text('CLIENTE:', 120, 35);
        doc.setFontStyle('normal');
        doc.setFontSize(12);
        doc.rect(120, 27, 70, 0, 'S');
        doc.text(b.name.toUpperCase(), 120, 42);

        doc.text('Numero: ' + expression.replace('{x}', (startNumber + i)), 10, 60);
        doc.text('Fecha: ' + b.created, 50, 60);
        doc.rect(10, 62, 90, 0, 'S');

        doc.setFontSize(8);
        var start = 80;
        doc.text('Codigo', 10, start);
        doc.text('Descripcion', 30, start);
        doc.text('Base Imponible', 150, start, 'right');
        doc.text('% IVA', 175, start, 'right');
        doc.text('Importe', 200, start, 'right');

        b.transactions.forEach(function(t, count) {
            const net = t.amount / ((100 + IVA) / 100);
            doc.setFontSize(12);
            start += 10;
            doc.text(`${count + 1}`, 10, start);
            (t.description + '  ').match(/(.{1,38}\s)\s*/g).forEach(function(line, i) {
                doc.text(line, 30, start + (i * 5));
            });
            doc.text(system.toCurrency(net), 150, start, 'right');
            doc.text(IVA.toString() + '%', 175, start, 'right');

            doc.text(system.toCurrency(t.amount), 200, start, 'right');
        });

        const total = b.transactions.reduce((tot, i) => tot + i.amount, 0);
        const totalNet = total / ((100 + IVA) / 100);
        doc.text('BASE IMPONIBLE', 140, 240, 'right');
        doc.text(system.toCurrency(totalNet), 190, 240, 'right');
        doc.text('%', 140, 247, 'right');
        doc.text('21%', 190, 247, 'right');
        doc.text('IVA', 140, 254, 'right');
        doc.text(system.toCurrency(total - totalNet), 190, 254, 'right');
        doc.setFontSize(16);
        doc.text('TOTAL', 140, 265, 'right');
        doc.text(system.toCurrency(total), 190, 265, 'right');

        doc.rect(10, 235, 190, 0, 'S');

        doc.setFontSize(10);
        doc.text('HIDIME BELLEZA S.L.', 10, 240);
        doc.text('Calle Salitre 11, 29002 Malaga', 10, 245);
        doc.text('NIF: B93140986', 10, 250);

    });

    doc.output('save', 'facturas.pdf');
}