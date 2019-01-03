const { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial } = require('./common');
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const fs = require('fs');
const path = require('path');
const PdfDoc = require('pdfkit');
const pdftoimage = require('pdftoimage');

module.exports = async function (db, google, { title }) {
    const file = fs.createWriteStream(path.resolve(__dirname, './facturas_de_compra.pdf'));
    const bills = await db.collection('bills').find().toArray();
    const doc = new PdfDoc();
    doc.pipe(file);
    doc
        .fontSize(20)
        .text(`FACTURAS ${title}`, 15, 200, { width: 600, align: 'center' });
    const data = [];
    await promiseSerial(bills
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter(a => !a.deducted)
        .map(i => {
            return async () => {
                const billDateString = new Date(i.date).formatDay('dddd, dd mmm yyyy', dayNames, monthNames);
                const totals = getTotals(i.amount, i.iva);
                for (let f = 0; f < i.files.length; f++) {
                    const extname = path.extname(i.files[f].name);
                    const fileName = path.basename(i.files[f].name, extname);
                    const pathFile = path.resolve(__dirname, `temp/${fileName}-${f}${extname}`);
                    await (new Promise(function (resolve, reject) {
                        const dest = fs.createWriteStream(pathFile);
                        google.download(i.files[f].googleRef)
                            .on('end', resolve)
                            .pipe(dest)
                            .on('error', reject);
                    }));
                    if (extname === '.pdf') {
                        await pdftoimage(pathFile, {
                            format: 'jpeg',
                            outdir: path.resolve(__dirname, 'temp')
                        });
                        let fi = 1;
                        while (fs.existsSync(pathFile.replace(extname, `-${fi}.jpg`))) {
                            doc.addPage();
                            if (fi === 1) {
                                doc.rect(0, 0, 700, 10).fillColor('white');
                                doc
                                    .fontSize(10)
                                    .fillColor('black')
                                    .text(`${billDateString} [#${i.number}] - ${i.emitter.company} (${i.emitter.cif}) TOTAL: ${totals['BASE IMPONIBLE']}€ + ${totals['IVA']}€ (${totals['PORCENTAJE IVA']}) = ${totals.TOTAL}€`, 1, 5, { width: 800 });

                            }
                            doc.image(pathFile.replace(extname, `-${fi}.jpg`), 15, 15, { fit: [600, 800] });
                            fi++;
                        }

                    } else {

                        doc.addPage();
                        doc.rect(0, 0, 700, 10).fillColor('white');
                        doc
                            .fontSize(10)
                            .fillColor('black')
                            .text(`${billDateString} [#${i.number}] - ${i.emitter.company} (${i.emitter.cif}) TOTAL: ${totals['BASE IMPONIBLE']}€ + ${totals['IVA']}€ (${totals['PORCENTAJE IVA']}) = ${totals.TOTAL}€`, 1, 5, { width: 800 });

                        doc.image(pathFile, 15, 15, { fit: [600, 800] });
                    }
                }

                const link = i.files[0] ? await google.shareFile(i.files[0].googleRef) : '';
                data.push(Object.assign({
                    DATA: billDateString,
                    EMISOR: i.emitter.company,
                    CIF: i.emitter.cif,
                    NUMERO: i.number,
                    PAGO: i.type === 'efectivo' ? 'EFECTIVO' : 'BANCO',
                    'DIRECCIÓN': i.emitter.address,
                    LINK: link
                }, totals));
            };
        }));

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, title);

    /* generate buffer */
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    fs.writeFileSync(path.resolve(__dirname, './somario_facturas_de_compra.xlsx'), buf);

    doc.end();
};
