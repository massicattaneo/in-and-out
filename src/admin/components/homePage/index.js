import { HtmlView } from 'gml-html';
import admin2Tpl from './level2.html';
import admin0Tpl from './level1.html';
import * as style from './style.scss';

const numberOfMonths = 13;

export default async function ({ system, thread, locale }) {
    const htmlView = HtmlView('<div><div #level1></div><div #level2></div></div>', []);
    const model = window.rx.create({ cash: [], bonus: [] });

    htmlView.refresh = async function () {
        htmlView.clear('level1').clear('level2');
        model.bonus.splice(0, 1000000000);
        model.cash.splice(0, 1000000000);
        if (system.store.adminLevel === 2) {
            const year = new Date();
            year.setMonth(year.getMonth() - numberOfMonths);
            year.setDate(1);
            year.setHours(0, 0, 0, 0);
            const cash = await thread.execute('rest-api', {
                api: `cash?date>${year.getTime()}`,
                method: 'get'
            });
            model.cash.push(...cash);
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            const bonus = await thread.execute('rest-api', {
                api: `bonus?created>${date.getTime()}`,
                method: 'get'
            });
            model.bonus.push(...bonus);
        }
    };

    window.rx.connect({ adminLevel: () => system.store.adminLevel }, htmlView.refresh);
    window.rx.connect({
        cash: () => model.cash,
        orders: () => system.store.orders,
        adminLevel: () => system.store.adminLevel }, ({ cash, orders, adminLevel }) => {
        if (adminLevel === 2) {
            const monthNames = new Array(12).fill(0).map((v, i) => locale.get(`month_${i}`).toUpperCase());
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const month = new Date();
            month.setDate(1);
            month.setHours(0, 0, 0, 0);

            const trimonth = new Date();
            trimonth.setMonth(Math.floor(trimonth.getMonth() / 3) * 3);
            trimonth.setDate(1);
            trimonth.setHours(0, 0, 0, 0);

            const dm = { today: 0, month: 0, trimonth: 0, year: 0 };

            const salitre = Object.create(dm);
            salitre.months = new Array(numberOfMonths).fill(0);
            const buenaventura = Object.create(dm);
            buenaventura.months = new Array(numberOfMonths).fill(0);
            const compania = Object.create(dm);
            compania.months = new Array(numberOfMonths).fill(0);
            const online = Object.create(dm);
            online.months = new Array(numberOfMonths).fill(0);
            const total = Object.create(dm);
            total.months = new Array(numberOfMonths).fill(0);
            const result = { salitre, buenaventura, compania, online, total };

            cash
                .reduce((acc, i) => {
                    if (i.date >= today.getTime()) {
                        acc[i.user].today += i.amount;
                        acc.total.today += i.amount;
                    }
                    if (i.date >= month.getTime()) {
                        acc[i.user].month += i.amount;
                        acc.total.month += i.amount;
                    }
                    if (i.date >= trimonth.getTime()) {
                        acc[i.user].trimonth += i.amount;
                        acc.total.trimonth += i.amount;
                    }
                    const lastYearMonth = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
                    lastYearMonth.setMonth(lastYearMonth.getMonth() + 1);
                    lastYearMonth.setDate(1);
                    lastYearMonth.setHours(0, 0, 0, 0);

                    const thisMonth = (new Date(i.date));
                    if (thisMonth.getTime() > lastYearMonth.getTime()) {
                        acc[i.user].months[thisMonth.getMonth() + numberOfMonths - 12] += i.amount;
                        acc[i.user].year += i.amount;
                        acc.total.months[thisMonth.getMonth() + numberOfMonths - 12] += i.amount;
                        acc.total.year += i.amount;
                    } else if (numberOfMonths > 12) {
                        acc[i.user].months[numberOfMonths - 13] += i.amount;
                        acc.total.months[numberOfMonths - 13] += i.amount;
                    }


                    return acc;
                }, result);

            const view = htmlView.clear('level2').appendTo('level2', admin2Tpl, style, {
                users: Object.keys(result)
                    .reduce((arr, key) => arr.concat({
                        name: key.toUpperCase(),
                        today: system.toCurrency(result[key].today),
                        month: system.toCurrency(result[key].month),
                        trimonth: system.toCurrency(result[key].trimonth),
                        year: system.toCurrency(result[key].year)
                    }), [])
            });

            orders.reduce((acc, i) => {
                if (i.created >= today.getTime()) {
                    acc['online'].today += i.amount/100;
                    acc.total.today += i.amount/100;
                }
                if (i.created >= month.getTime()) {
                    acc['online'].month += i.amount/100;
                    acc.total.month += i.amount/100;
                }
                if (i.created >= trimonth.getTime()) {
                    acc['online'].trimonth += i.amount/100;
                    acc.total.trimonth += i.amount/100;
                }
                const lastYearMonth = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
                lastYearMonth.setMonth(lastYearMonth.getMonth() + 1);
                lastYearMonth.setDate(1);
                lastYearMonth.setHours(0, 0, 0, 0);

                const thisMonth = (new Date(i.created));
                if (thisMonth.getTime() > lastYearMonth.getTime()) {
                    acc['online'].months[thisMonth.getMonth() + numberOfMonths - 12] += i.amount/100;
                    acc['online'].year += i.amount/100;
                    acc.total.months[thisMonth.getMonth() + numberOfMonths - 12] += i.amount/100;
                    acc.total.year += i.amount/100;
                } else if (numberOfMonths > 12) {
                    acc['online'].months[numberOfMonths - 13] += i.amount/100;
                    acc.total.months[numberOfMonths - 13] += i.amount/100;
                }
                return acc;
            }, result);

            var ctx = view.get('chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.total.months.map((tot, i, a) => monthNames[i ? i - 1 : a.length - 2]),
                    datasets: [
                        {
                            label: 'SALITRE',
                            data: result.salitre.months,
                            backgroundColor: '#cdfaff',
                            borderWidth: 1
                        },
                        {
                            label: 'COMPAÑIA',
                            data: result.compania.months,
                            backgroundColor: '#cdffd6',
                            borderWidth: 1
                        },
                        {
                            label: 'BUENAVENTURA',
                            data: result.buenaventura.months,
                            backgroundColor: '#ffcdcd',
                            borderWidth: 1
                        },
                        {
                            label: 'ONLINE',
                            data: result.online.months,
                            backgroundColor: '#fff1b0',
                            borderWidth: 1
                        },
                        {
                            label: 'TOTAL',
                            data: result.total.months,
                            backgroundColor: '#000000',
                            borderWidth: 1
                        }
                    ]
                }
            });
        }
    });
    window.rx.connect({ cash: () => model.cash, bonus: () => model.bonus, adminLevel: () => system.store.adminLevel },
        ({ cash, bonus, adminLevel }) => {
            if (adminLevel === 2) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const dm = { cash: 0, creditCards: 0 };

                const salitre = Object.create(dm);
                const buenaventura = Object.create(dm);
                const total = Object.create(dm);
                const result = { salitre, buenaventura, total };

                cash
                    .reduce((acc, i) => {
                        if (i.date >= today.getTime() && i.amount > 0) {
                            if (i.type === 'efectivo') {
                                acc[i.user].cash += i.amount;
                                acc.total.cash += i.amount;
                            }
                            if (i.type === 'tarjeta') {
                                acc[i.user].creditCards += i.amount;
                                acc.total.creditCards += i.amount;
                            }
                        }
                        return acc;
                    }, result);

                const view = htmlView.clear('level1').appendTo('level1', admin0Tpl, style, {
                    bonus: bonus.map(b => {
                        const client = system.store.clients.find(i => i._id === b.clientId);
                        return {
                            price: system.toCurrency(b.payed),
                            title: b.title,
                            href: `${locale.get('urls.history.href')}?id=${client._id}`,
                            client: `${client.surname || ''} ${client.name}`
                        };
                    }).concat([{
                        price: system.toCurrency(bonus.reduce((tot, item) => tot + item.payed, 0)),
                        title: 'TOTAL',
                        href: ``,
                        client: ``
                    }]),
                    users: Object.keys(result)
                        .reduce((arr, key) => arr.concat({
                            name: key.toUpperCase(),
                            cash: system.toCurrency(result[key].cash),
                            creditCards: system.toCurrency(result[key].creditCards),
                            total: system.toCurrency(result[key].creditCards + result[key].cash)
                        }), [])
                });


            }
        });

    return htmlView;
}
