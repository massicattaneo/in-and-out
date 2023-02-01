import { HtmlView } from 'gml-html';
import admin2Tpl from './level2.html';
import admin0Tpl from './level1.html';
import * as style from './style.scss';

const numberOfMonths = 13;

function monthDiff(start, end) {
    var tempDate = new Date(start);
    var monthCount = 0;
    while ((tempDate.getMonth() + '' + tempDate.getFullYear()) != (end.getMonth() + '' + end.getFullYear()) && monthCount < numberOfMonths) {
        monthCount++;
        tempDate.setMonth(tempDate.getMonth() + 1);
    }
    return monthCount + 1;
}

function calculateMOnth(d) {
    const now = new Date();
    now.setDate(d.getDate());
    now.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    const monthDiffCalc = monthDiff(d, now);
    return numberOfMonths - monthDiffCalc;
}

export default async function ({ system, thread, locale }) {
    const htmlView = HtmlView('<div><div #level1></div><div #level2></div></div>', []);
    const model = window.rx.create({ cash: [], bonus: [] });
    
    htmlView.refresh = async function () {
        htmlView.clear('level1').clear('level2');
        model.bonus.splice(0, 1000000000);
        model.cash.splice(0, 1000000000);
        if (system.store.adminLevel === 2) {
            const year = new Date();
            year.setMonth(year.getMonth() - numberOfMonths + 1);
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
        adminLevel: () => system.store.adminLevel,
        'cashSalitre': () => system.store['cash-salitre'],
        'cashBuenaventura': () => system.store['cash-buenaventura'],
        'cashPortanueva': () => system.store['cash-portanueva'],
    }, ({ cash, orders, adminLevel, cashSalitre, cashBuenaventura }) => {
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
            const portanueva = Object.create(dm);
            portanueva.months = new Array(numberOfMonths).fill(0);
            const online = Object.create(dm);
            online.months = new Array(numberOfMonths).fill(0);
            const total = Object.create(dm);
            total.months = new Array(numberOfMonths).fill(0);
            const result = { salitre, buenaventura, portanueva, online, total };


            cash
                .filter(acc => acc.user !== 'compania')
                .reduce((acc, i) => {
                    const user = (i.user === "null" || !i.user) ? 'salitre' : i.user;
                    if (i.date >= today.getTime()) {
                        acc[user].today += i.amount;
                        acc.total.today += i.amount;
                    }
                    if (i.date >= month.getTime()) {
                        acc[user].month += i.amount;
                        acc.total.month += i.amount;
                    }
                    if (i.date >= trimonth.getTime()) {
                        acc[user].trimonth += i.amount;
                        acc.total.trimonth += i.amount;
                    }
                    const thisYearFirstMonth = new Date();
                    thisYearFirstMonth.setMonth(0);
                    thisYearFirstMonth.setDate(1);
                    thisYearFirstMonth.setHours(0, 0, 0, 0);

                    const thisMonth = (new Date(i.date));

                    if (thisMonth.getTime() > thisYearFirstMonth.getTime()) {
                        acc.total.year += i.amount;
                        acc[user].year += i.amount;
                    }
                    acc.total.months[calculateMOnth(thisMonth)] += i.amount;
                    acc[user].months[calculateMOnth(thisMonth)] += i.amount;

                    return acc;
                }, result);

            orders.reduce((acc, i) => {
                if (new Date(i.created).getTime() >= today.getTime()) {
                    acc['online'].today += i.amount / 100;
                    acc.total.today += i.amount / 100;
                }
                if (new Date(i.created).getTime() >= month.getTime()) {
                    acc['online'].month += i.amount / 100;
                    acc.total.month += i.amount / 100;
                }
                if (new Date(i.created).getTime() >= trimonth.getTime()) {
                    acc['online'].trimonth += i.amount / 100;
                    acc.total.trimonth += i.amount / 100;
                }

                const thisYearFirstMonth = new Date();
                thisYearFirstMonth.setMonth(0);
                thisYearFirstMonth.setDate(1);
                thisYearFirstMonth.setHours(0, 0, 0, 0);

                const thisMonth = (new Date(i.created));
                if (thisMonth.getTime() > thisYearFirstMonth.getTime()) {
                    acc['online'].year += i.amount / 100;
                    acc.total.year += i.amount / 100;
                }
                acc['online'].months[calculateMOnth(thisMonth)] += i.amount / 100;
                acc.total.months[calculateMOnth(thisMonth)] += i.amount / 100;
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
                    }), []),
                cashSalitre: system.toCurrency(cashSalitre), 
                cashBuenaventura: system.toCurrency(cashBuenaventura)
            });

            var ctx = view.get('chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.total.months.map((tot, i, a) => monthNames[(new Date().getMonth() + i) % 12]),
                    datasets: [
                        {
                            label: 'SALITRE',
                            data: result.salitre.months,
                            backgroundColor: '#cdfaff',
                            borderWidth: 1
                        },
                        {
                            label: 'BUENAVENTURA',
                            data: result.buenaventura.months,
                            backgroundColor: '#ffcdcd',
                            borderWidth: 1
                        },
                        {
                            label: 'PORTANUEVA',
                            data: result.portanueva.months,
                            backgroundColor: '#cdffd6',
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
                        },
                        {
                            label: 'Total',
                            data: result.total.months.map(function (item, index, array) {
                                return (item + (array[index + 1] || item)) / 2;
                            }),
                            type: 'line',
                            options: {
                                cubicInterpolationMode: 'default'
                            }
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
                const portanueva = Object.create(dm);
                const total = Object.create(dm);
                const result = { salitre, buenaventura, portanueva, total };

                cash
                    .reduce((acc, i) => {
                        const user = (i.user === "null" || !i.user) ? 'salitre' : i.user;
                        if (i.date >= today.getTime() && i.amount > 0) {
                            if (i.type === 'efectivo') {
                                acc[user].cash += i.amount;
                                acc.total.cash += i.amount;
                            }
                            if (i.type === 'tarjeta') {
                                acc[user].creditCards += i.amount;
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
