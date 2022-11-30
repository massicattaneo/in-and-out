// FROM: https://www.worlddata.info/europe/italy/timezones.php

const spainOffsets = [
    1540692000000, //new Date('2018-10-28T03:00').getTime(),
    1553994000000, //new Date('2019-03-31T02:00').getTime(),
    1572141600000, //new Date('2019-10-27T03:00').getTime(),
    1585443600000, //new Date('2020-03-29T02:00').getTime(),
    1603591200000, //new Date('2020-10-25T03:00').getTime(),
    1616893200000, //new Date('2021-03-28T02:00').getTime(),
    1635645600000, //new Date('2021-10-31T03:00').getTime(),
    1648342800000, //new Date('2022-03-27T02:00').getTime()
    1667095200000, //new Date('2022-10-30T03:00').getTime()
    1679792400000, //new Date('2023-03-26T02:00').getTime()
    1698544800000, //new Date('2023-10-29T03:00').getTime()
    1711846800000, //new Date('2024-03-31T02:00').getTime()
    1729994400000, //new Date('2024-10-27T03:00').getTime()
    1743296400000, //new Date('2025-03-30T02:00').getTime()
    1761444000000, //new Date('2025-10-26T03:00').getTime()
    1774746000000, //new Date('2026-03-29T02:00').getTime()
];

function getSpainOffset(date = Date.now()) {
    const reference = new Date(date);
    const bigger = spainOffsets.find(item => item > reference.getTime());
    const index = (spainOffsets.indexOf(bigger)) - 1;
    return (index % 2) + 1;
}

function getCalendar({ calendars }, date) {
    const d = new Date(date).getTime();
    return calendars.find(c => {
        return new Date(`${c.from}T00:00:00.000Z`).getTime() < d && new Date(`${c.to}T23:59:59.999Z`).getTime() > d;
    });
}


function getWorkers({ calendars }, date, center) {
    const calendar = getCalendar({ calendars }, date);
    const day = calendar.week[new Date(date).getDay()];
    return day
        .filter(d => d[0] === center)
        .reduce(function (ret, d) {
            if (ret.indexOf(d[1]) === -1) ret.push(d[1]);
            return ret;
        }, []);
}

function getWorkersByHour({ calendars }, date, center) {
    const calendar = getCalendar({ calendars }, date);
    const day = calendar.week[new Date(date).getDay()];
    return day
        .filter(d => d[0] === center)
        .filter(d => {
            const dt = new Date(date);
            const from = new Date(date);
            from.setUTCHours(...decimalToTime(d[2], -getSpainOffset(from)));
            const to = new Date(date);
            to.setUTCHours(...decimalToTime(d[3], -getSpainOffset(to)));
            return from.getTime() <= dt.getTime() && to.getTime() > dt.getTime();
        })
        .reduce(function (ret, d) {
            if (ret.indexOf(d[1]) === -1) ret.push(d[1]);
            return ret;
        }, []);
}

function getTreatmentsDuration({ workers }, all, sel, worker) {
    if (sel.filter(function (id) {
        const t = all.find(t => t.identificador === id);
        return Number(t[workers[worker].column]) === 0;
    }).length) return 0;
    const reduce = sel.reduce(function (tot, id) {
        const t = all.find(t => t.identificador === id);
        return tot + Number(t[workers[worker].column]);
    }, 0);
    return Math.ceil(reduce / minimumTime) * minimumTime;
}

function decimalToTime(decimalTimeString, utcOffset = 0) {
    const n = new Date(0, 0);
    n.setSeconds(+decimalTimeString * 60 * 60);
    return n.toTimeString()
        .slice(0, 8)
        .split(':')
        .concat([0])
        .map(e => parseInt(e, 10))
        .map((a, i) => i === 0 ? a + utcOffset : a);
}

const minimumTime = 15;
const storeTypes = {
    'TRT': 'treatments',
    'TAR': 'bonusCards',
    'PRD': 'products'
};

function newArray(length, item = '') {
    return Array.apply(null, Array(length)).map(i => item);
}

function roundDiscount(price, discount) {
    return Math.round(price * discount * 100) / 100;
}

function getDiscountsItems(discounts) {
    return discounts.reduce((a1, d) => a1.concat(...d.items.map(i => newArray(i.count, i.id))), []);
}

function sortByDate(field, order = -1) {
    return function (a, b) {
        return (-order * (new Date(b[field].split('/').reverse().join('-'))).getTime()) + (order *
            (new Date(a[field].split('/').reverse().join('-'))).getTime());
    };
}

function activePromotions(promotions, order) {
    return promotions.filter(function (i) {
        const date = Date.now();
        const from = (new Date(i.desde.split('/').reverse().join('-')));
        const to = (new Date(i.hasta.split('/').reverse().join('-')));
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 59);
        return date >= from.getTime() && date <= to.getTime();
    }).sort(sortByDate('creacion', order));
}

function getPromotionDiscounts(promotion) {
    return (promotion.discounts || '').split(',').map(d => {
        const discount = Number(d.split('=')[1]);
        const items = d.split('=')[0].split('|').map(i => {
            return { count: Number(i.split('x')[0]), id: i.split('x')[1], type: i.split('x')[1].substr(0, 3) };
        });
        return { discount, items };
    });
}

function getDiscountsPrice(store, discounts) {
    if (discounts[0].items[0].id.endsWith('*')) return ``;
    return discounts
        .reduce((t1, d) => t1 + d.items
            .reduce((t2, i) => {
                const price = i.count * store[storeTypes[i.type]].find(o => o.identificador === i.id).precio;
                return t2 + roundDiscount(price, d.discount);
            }, 0), 0);
}

function futurePromotions(promotions) {
    return promotions.filter(function (i) {
        const date = Date.now();
        const from = (new Date(i.desde.split('/').reverse().join('-')));
        const to = (new Date(i.hasta.split('/').reverse().join('-')));
        const [hour = 0, minute = 0] = i.desde_hora ? i.desde_hora.split(':') : [0,0]
        from.setHours(Number(hour), Number(minute), 0, 0);
        to.setHours(23, 59, 59, 59);
        return date >= from.getTime() && date <= to.getTime();
    }).sort(sortByDate('desde'));
}

function getCenters({ calendars }, date) {
    const calendar = getCalendar({ calendars }, date);
    const day = calendar.week[new Date(date).getDay()];
    return day.reduce(function (ret, d) {
        if (ret.indexOf(d[0]) === -1) ret.push(d[0]);
        return ret;
    }, []);
}

function isCenterClosed({ calendars }, centerIndex, date) {
    const end = new Date(date);
    end.setUTCHours(23, 59, 59);
    const start = new Date(date);
    start.setUTCHours(0, 0, 0);
    const res = calendars
        .filter(c => end.getTime() > new Date(`${c.from}T00:00:00.000Z`))
        .filter(c => start.getTime() <= new Date(`${c.to}T23:59:59.999Z`))
        .map(c => Object.assign(c, { closed: c.week.filter(day => day.filter(worker => worker[0] === centerIndex).length).length === 0 }));
    return res.length && res[0].closed;
}

function getAvailableHours(db, date, center, treatments, selTreatments, freeBusy) {
    const hours = [];
    const workers = getWorkers(db, date, center);
    const { serverTimestamp } = db;
    workers
        .filter(w => getTreatmentsDuration(db, treatments, selTreatments, w) > 0)
        .forEach(function (w) {
            const calendar = getCalendar(db, date);
            const day = calendar.week[new Date(date).getDay()];
            const duration = getTreatmentsDuration(db, treatments, selTreatments, w) / 60;
            const busy = freeBusy[w] || [];
            const workerHours = day.filter(i => i[1] === w);
            const dt = new Date(date);
            workerHours
                .filter(wh => wh[0] === center)
                .forEach(function (wh) {
                    for (let h = wh[2]; h <= (wh[3] - duration); h += 0.25) {
                        dt.setUTCHours(...decimalToTime(h, -getSpainOffset(dt)));
                        const hStart = new Date(dt);
                        dt.setUTCHours(...decimalToTime(h + duration, -getSpainOffset(hStart)));
                        const hEnd = new Date(dt);
                        const filter = busy.filter(function ({ start, end }) {
                            const bStart = new Date(start);
                            const bEnd = new Date(end);
                            return (bStart >= hEnd) || (bEnd <= hStart);
                        });
                        if (filter.length === busy.length && hStart.getTime() > new Date(serverTimestamp).getTime()) {
                            hours.push(h);
                        }
                    }
                });
        });
    return hours.filter((h, i, a) => a.indexOf(h) === i).sort();
}

function isInPromotion(promotions, item) {
    return promotions
        .filter(promo => {
            const promoStart = new Date(promo.desde.split('/').reverse().join('/'));
            return Date.now() > promoStart.getTime();
        })
        .map(getPromotionDiscounts)
        .reduce((a, i) => a.concat(i), [])
        .filter(i => {
            const searchPromo = i.items.find(o => o.id === item.identificador);
            return searchPromo && i.items.find(c => c.id === searchPromo.id);
        }).length;
}

module.exports = {
    getCalendar: getCalendar,
    getCenters,
    getWorkers: getWorkers,
    getWorkersByHour: getWorkersByHour,
    isCenterClosed,
    getTreatments: function ({ calendars, workers, centers }, date, center, treatments) {
        const calendar = getCalendar({ calendars }, date);
        const day = calendar.week[new Date(date).getDay()];
        const wks = getWorkers({ calendars }, date, center);
        const centerId = centers[center].id;
        return treatments
            .filter(t => t.favourite)
            .filter(t => t.online === 'si')
            .filter(t => t.activo === 'si')
            .filter(t => workers.filter(worker => t[worker.column] !== 0).length)
            .filter(t => day.filter(arr => arr.length && Number(t[workers[arr[1]].column]) > 0).length)
            .map(t => Object.assign({
                available: day.filter(arr => arr.length && Number(t[workers[arr[1]].column]) > 0
                    && wks.indexOf(arr[1]) !== -1).length > 0
                    && t[centerId] !== '0'
            }, t));
    },
    getTreatmentsDuration: getTreatmentsDuration,
    decimalToTime: decimalToTime,
    getAvailableHours,
    getLocation: function (db, date, googleId) {
        const cal = getCalendar(db, date);
        const workerIndex = db.workers.find(w => w.googleId === googleId).index;
        const bookDate = new Date(date);
        const filter = cal.week[(bookDate.getDay())]
            .filter(a => a[1] === workerIndex)
            .filter(a => {
                const start = new Date(date);
                start.setUTCHours(...decimalToTime(a[2], -getSpainOffset(start)));
                return start.getTime() <= bookDate.getTime();
            })
            .filter(a => {
                const end = new Date(date);
                end.setUTCHours(...decimalToTime(a[3], -getSpainOffset(end)));
                return end.getTime() > bookDate.getTime();
            });
        return filter.length ? db.centers.find(c => c.index === filter[0][0]) : 'NO LOCATION';
    },
    getPromotionDiscounts: getPromotionDiscounts,
    isInPromotion: isInPromotion,
    getDiscountsPrice,
    getDiscountsItems: getDiscountsItems,
    getCartTotal: function cartTotal(store, cart) {
        let discounted = 0;
        let notDiscounted = 0;
        let real = 0;
        let discTypes = [];
        
        if (activePromotions(store.promotions).filter(p => p.discounts.indexOf('*') !== -1).length) {
            const allItemsDiscount = activePromotions(store.promotions).filter(p => p.discounts.indexOf('*') !== -1);
            const all = allItemsDiscount.map(item => item.discounts)
            const typeDiscounteds = all.map(ii => ii.split('&').map(d => [d.match(/\d*x(.*)-\*/)[1], Number(d.match(/\d*x\w*-\*=(.*)/)[1])]));
            const typeDiscounted = typeDiscounteds.reduce((acc,item) => acc.concat(item), [])
            discTypes.push(...typeDiscounted.map(i => i[0]));
            typeDiscounted.forEach(function ([type, disc]) {
                cart.forEach(function (id) {
                    const t = storeTypes[id.substr(0, 3)];
                    const it = store[t].find(i => i.identificador === id);
                    const tot = Number(it.precio);
                    const isDisc = (!isBiologique(it)) && (!Number(it.credito) > 0) && (id.match(/(.*)-\d*/)[1] === type);
                    discounted += isDisc ? tot * disc : 0;
                    real += isDisc ? tot : 0;
                });
            });
        }
        const items = activePromotions(store.promotions).reduce(function ({ discounted, notDiscounted }, p) {
            const dis = getPromotionDiscounts(p);
            const it = getDiscountsItems(dis);
            while (it.filter(i => notDiscounted.indexOf(i) !== -1).length === it.length) {
                it.forEach(function (i) {
                    if (notDiscounted.indexOf(i) !== -1) {
                        discounted.push({
                            id: (notDiscounted.splice(notDiscounted.indexOf(i), 1))[0],
                            discount: dis.find(oo => oo.items.filter(ii => ii.id === i).length > 0).discount
                        });
                    }
                });
            }
            return { discounted, notDiscounted };
        }, { discounted: [], notDiscounted: getNotDisocunted(cart, discTypes, store) });
        notDiscounted += items.notDiscounted.reduce((t, id) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + Number(it.precio);
        }, 0);
        discounted += items.discounted.reduce((t, { id, discount }) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + roundDiscount(Number(it.precio), discount);
        }, 0);
        real += getNotDisocunted(cart, discTypes, store).reduce((t, id) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + Number(it.precio);
        }, 0);
        return {
            total: Number((notDiscounted + discounted).toFixed(2)), 
            discount: Number((real - notDiscounted - discounted).toFixed(2)), 
            real: Number((real).toFixed(2))
        };
    },
    sortByDate,
    activePromotions,
    futurePromotions,
    getSpainOffset,
    toICSDate: function toICSDate(date) {
        return new Date(date).toISOString().replace(/-/g, '').replace(/:/g, '').substr(0, 15);
    },
    spainOffsets
};

function isBiologique(it) {
    return it.marca === 'Biologique Recherche';
}

function getNotDisocunted(cart, discTypes, store) {
    return cart.filter(id => {
        const t = storeTypes[id.substr(0, 3)];
        const it = store[t].find(i => i.identificador === id);
        if (isBiologique(it)) return true
        
        if (Number(it.credito) > 0) return true
        return discTypes.indexOf(id.match(/(.*)-.*/)[1]) === -1
    });
}

