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
            v.get().print = async function () {
                const from = this.from.valueAsDate;
                from.setHours(0, 0, 0, 0);
                const to = this.to.valueAsDate;
                to.setHours(23, 0, 0, 0);
                const progressive = Number(this.progressive.value);
                const maximum = Number(this.maximum.value);
                const expression = this.expression.value;
                const users = {
                    salitre: this.salitre.checked,
                    compania: this.compania.checked,
                    buenaventura: this.buenaventura.checked
                };
                const data = await thread.execute('rest-api', {
                    api: `cash?date>${from.getTime()}&date<${to.getTime()}`,
                    method: 'get'
                });

                const cash = data
                    .filter(i => users[i.user])
                    .filter(i => i.type === 'efectivo')
                    .sort((a, b) => a.amount - b.amount);

                const toPrint = [];
                while (cash.length && toPrint.reduce((tot, item) => tot + item.amount, 0) < maximum) {
                    toPrint.push(...cash.splice(0, 1));
                }

                const items = data
                    .filter(i => users[i.user])
                    .filter(i => i.type === 'tarjeta')
                    .concat(toPrint)
                    .filter(i => i.amount > 0)
                    .reduce((arr, item) => {
                        const find = arr.find(d => d.clientId === item.clientId
                            && item.clientId !== ''
                            && sameDay(item.date, d.date));
                        if (find) {
                            find.transactions.push(item);
                        } else {
                            item.transactions = [item];
                            arr.push(item);
                        }
                        return arr;
                    }, [])
                    .sort((a, b) => a.date - b.date)
                    .map(function (i) {
                        const find = system.store.clients.find(c => c._id === i.clientId);
                        return {
                            name: find ? `${find.surname} ${find.name}` : 'SIN CONTACTO',
                            created: new Date(i.date).formatDay('dd/mm/yyyy'),
                            transactions: i.transactions
                        };
                    });
                if (!items.length) system.throw('custom', { message: 'NO HAY FACTURAS CON ESTOS CRITERIOS' });
                printBills(progressive, expression, items, system);
            };
        }
    });

    view.destroy = function () {

    };

    return view;
}