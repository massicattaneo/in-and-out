import { HtmlView } from 'gml-html';
import admin2Tpl from './admin-2.html';
import admin0Tpl from './admin-0.html';
import * as style from './style.scss';

export default async function ({ system, thread, locale }) {
    const htmlView = HtmlView('<div><div #level1></div><div #level2></div></div>', []);
    const model = window.rx.create({ cash: [], bonus: [] });

    htmlView.refresh = async function () {
        htmlView.clear('level1').clear('level2');
        model.bonus.splice(0, 100000000);
        model.cash.splice(0, 100000000);
        if (system.store.adminLevel === 2) {
            const year = new Date();
            year.setMonth(0);
            year.setDate(1);
            year.setHours(0, 0, 0, 0);
            const cash = await thread.execute('rest-api', {
                api: `cash?date>${year.getTime()}`,
                method: 'get'
            });
            model.cash.push(...cash);
        } else if (system.store.adminLevel >= 0) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            const bonus = await thread.execute('rest-api', {
                api: `bonus?created>${date.getTime()}`,
                method: 'get'
            });
            model.bonus.push(...bonus);
            model.cash.push(...system.store.cash);
        }
    };

    window.rx.connect({ adminLevel: () => system.store.adminLevel }, async function ({ adminLevel }) {
        htmlView.refresh();
    });

    window.rx.connect({ cash: () => model.cash, adminLevel: () => system.store.adminLevel }, ({ cash, adminLevel }) => {
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
            salitre.months = new Array(new Date().getMonth() + 1).fill(0);
            const buenaventura = Object.create(dm);
            buenaventura.months = new Array(new Date().getMonth() + 1).fill(0);
            const compania = Object.create(dm);
            compania.months = new Array(new Date().getMonth() + 1).fill(0);
            const total = Object.create(dm);
            total.months = new Array(new Date().getMonth() + 1).fill(0);
            const result = { salitre, buenaventura, compania, total };

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
                    const thisMonth = (new Date(i.date)).getMonth();
                    acc[i.user].months[thisMonth] += i.amount;
                    acc[i.user].year += i.amount;

                    acc.total.months[thisMonth] += i.amount;
                    acc.total.year += i.amount;

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

            var ctx = view.get('chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.total.months.map((tot, i) => monthNames[i]),
                    datasets: [{
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
                            label: 'TOTAL',
                            data: result.total.months,
                            backgroundColor: '#000000',
                            borderWidth: 1
                        }]
                }
            });
        }
    });


    window.rx.connect({ cash: () => model.cash, bonus: () => model.bonus, adminLevel: () => system.store.adminLevel },
        ({ cash, bonus, adminLevel }) => {
            if (adminLevel === 1 || adminLevel === 2) {
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