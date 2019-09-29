import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import { printBills } from './print-utils';

function sameDay(dateA, dateB) {
    if (new Date(dateA).getFullYear() !== new Date(dateB).getFullYear()) return false;
    if (new Date(dateA).getMonth() !== new Date(dateB).getMonth()) return false;
    if (new Date(dateA).getDate() !== new Date(dateB).getDate()) return false;
    return true;
}

export default async function ({ locale, system, thread }) {
    const view = HtmlView('<div/>', [], locale.get());
    view.style();

    window.rx.connect({ adminLevel: () => system.store.adminLevel }, async function ({ adminLevel }) {
        view.clear();
        if (adminLevel > 0) {
            const v = view.appendTo('', template, style, {});
            v.get('from').valueAsDate = new Date();
            v.get('to').valueAsDate = new Date();
            v.get().uploadCsv = async function () {
                const file = this.fileUpload.files[0];
                const newFileName = `temp.csv`;
                const formData = new FormData();
                formData.append('fileUpload', file, newFileName);

                await RetryRequest('/api/upload-bank', { timeout: 60000 }).post(formData)
                    .catch(function (e) {
                        system.throw('generic-error');
                    });
                alert('HECHO');
            };
            v.get().print = async function (type) {
                const from = this.from.valueAsDate;
                const password = btoa(this.password.value);
                const maxCashAmount = this.maximum.value;
                const saveBillNumbers = this.save.checked;
                from.setHours(0, 0, 0, 0);
                const to = this.to.valueAsDate;
                to.setHours(23, 0, 0, 0);
                if (type === 'bank') {
                    open(`/api/summary/banco.xlsx?from=${from.getTime()}&to=${to.getTime()}&password=${password}`);
                }
                if (type === 'bill_buy_xlsx') {
                    open(`/api/summary/facturas_compra.xlsx?&password=${password}`);
                }
                if (type === 'bill_buy_pdf') {
                    open(`/api/summary/facturas_compra.pdf?&password=${password}`);
                }
                if (type === 'bill_sell_pdf') {
                    open(`/api/summary/facturas_venta.pdf?from=${from.getTime()}&to=${to.getTime()}&password=${password}&maxCashAmount=${maxCashAmount}`);
                }
                if (type === 'bill_sell_xlsx') {
                    open(`/api/summary/facturas_venta.xlsx?from=${from.getTime()}&to=${to.getTime()}&password=${password}&maxCashAmount=${maxCashAmount}&saveBillNumbers=${saveBillNumbers}`);
                }
                if (type === 'bill_sell_report') {
                    open(`/api/summary/cash_summary.html?from=${from.getTime()}&to=${to.getTime()}&password=${password}&maxCashAmount=${maxCashAmount}`);
                }
            };
        }
    });

    view.destroy = function () {

    };

    return view;
}
