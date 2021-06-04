const { dayNames, monthNames, toCurrency, net, getTotals, promiseSerial } = require('../pdf/common');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const PdfDoc = require('pdfkit');
const pdftoimage = require('pdftoimage');

let memo;
module.exports = async function (db, google, { title }) {
    const pdfPathFile = path.resolve(__dirname, 'facturas_de_compra.pdf');
    const pdfBuffer = fs.createWriteStream(pdfPathFile);
    const wb = XLSX.utils.book_new();

    const bills = (await db.collection('bills').find().toArray())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter(a => !a.deducted);
    const doc = new PdfDoc();
    doc.pipe(pdfBuffer);
    doc
        .fontSize(20)
        .text(title, 15, 200, { width: 600, align: 'center' });
    const data = [];
    if (memo) return memo;
    memo = (async function f() {
        await promiseSerial(bills
            .map((billItem, billIndex, billArray) => {
                return async () => {
                    console.log(`PREPARING BILL ${billIndex + 1}/${billArray.length}`);
                    const billDateString = new Date(billItem.date).formatDay('dddd, dd mmm yyyy', dayNames, monthNames);
                    const totals = getTotals(billItem.amount, billItem.iva);
                    for (let f = 0; f < billItem.files.length; f++) {
                        const extname = path.extname(billItem.files[f].name);
                        const fileName = path.basename(billItem.files[f].name, extname);
                        const pathFile = path.resolve(__dirname, `temp/${fileName}-${f}${extname}`);
                        if (!fs.existsSync(pathFile)) {
                            await (new Promise(function (resolve, reject) {
                                const dest = fs.createWriteStream(pathFile);
                                google.download(billItem.files[f].googleRef)
                                    .on('end', resolve)
                                    .pipe(dest)
                                    .on('error', reject);
                            }));
                        }
                        if (extname.toLowerCase() === '.pdf') {
                            try {
                                await pdftoimage(pathFile, {
                                    format: 'jpeg',
                                    outdir: path.resolve(__dirname, 'temp')
                                });
                            } catch(e) {
                                console.log(e)
                            }
                            let fi = 1;
                            while (fs.existsSync(pathFile.replace(extname, `-${fi}.jpg`))) {
                                doc.addPage();
                                if (fi === 1) {
                                    doc.rect(0, 0, 700, 10).fillColor('white');
                                    doc
                                        .fontSize(10)
                                        .fillColor('black')
                                        .text(`${billDateString} [#${billItem.number}] - ${billItem.emitter.company} (${billItem.emitter.cif}) TOTAL: ${totals['BASE IMPONIBLE']}€ + ${totals['IVA']}€ (${totals['PORCENTAJE IVA']}) = ${totals.TOTAL}€`, 1, 5, { width: 800 });

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
                                .text(`${billDateString} [#${billItem.number}] - ${billItem.emitter.company} (${billItem.emitter.cif}) TOTAL: ${totals['BASE IMPONIBLE']}€ + ${totals['IVA']}€ (${totals['PORCENTAJE IVA']}) = ${totals.TOTAL}€`, 1, 5, { width: 800 });

                            doc.image(pathFile, 15, 15, { fit: [600, 800] });
                        }
                    }

                    const link = billItem.files[0] ? await google.shareFile(billItem.files[0].googleRef) : '';
                    data.push(Object.assign({
                        DATA: billDateString,
                        EMISOR: billItem.emitter.company,
                        CIF: billItem.emitter.cif,
                        NUMERO: billItem.number,
                        PAGO: billItem.type === 'efectivo' ? 'EFECTIVO' : 'BANCO',
                        'DIRECCIÓN': billItem.emitter.address,
                        LINK: link
                    }, totals));
                };
            }));

        const sheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, sheet, title);

        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        await new Promise(res => setTimeout(res, 3000));
        doc.end();
        await new Promise(res => setTimeout(res, 3000));
        console.log('FINISH');
        return { pdfBuffer: fs.readFileSync(pdfPathFile), excelBuffer };
    })();
};
