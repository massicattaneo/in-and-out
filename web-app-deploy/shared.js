function getCalendar({ calendars }, date) {
    const d = new Date(date).getTime();
    return calendars.find(c => {
        const end = new Date(c.to);
        end.setUTCHours(23, 59, 59, 99);
        return new Date(c.from).getTime() < d && end.getTime() > d;
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
            from.setUTCHours(...decimalToTime(d[2], -2));
            const to = new Date(date);
            to.setUTCHours(...decimalToTime(d[3], -2));
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
function sortByDate(field) {
    return function (a, b) {
        return (new Date(b[field].split('/').reverse().join('-'))).getTime() -
            (new Date(a[field].split('/').reverse().join('-'))).getTime();
    };
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

function activePromotions(promotions) {
    return promotions.filter(function (i) {
        const date = Date.now();
        const from = (new Date(i.desde.split('/').reverse().join('-')));
        const to = (new Date(i.hasta.split('/').reverse().join('-')));
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 59);
        return date >= from.getTime() && date <= to.getTime();
    }).sort(sortByDate('creacion'))
}

module.exports = {
    getCalendar: getCalendar,
    getCenters: function ({ calendars }, date) {
        const calendar = getCalendar({ calendars }, date);
        const day = calendar.week[new Date(date).getDay()];
        return day.reduce(function (ret, d) {
            if (ret.indexOf(d[0]) === -1) ret.push(d[0]);
            return ret;
        }, []);
    },
    getWorkers: getWorkers,
    getWorkersByHour: getWorkersByHour,
    isCenterClosed: function isCenterClosed({ calendars }, centerIndex, date) {
        const end = new Date(date);
        end.setHours(23, 59, 59);
        const start = new Date(date);
        start.setHours(0, 0, 0);
        const res = calendars
            .filter(c => end.getTime() > new Date(c.from))
            .filter(c => start.getTime() <= new Date(c.to))
            .map(c => Object.assign(c, { closed: c.week.filter(day => day.filter(worker => worker[0] === centerIndex).length).length === 0 }));
        return res.length && res[0].closed;
    },
    getTreatments: function ({ calendars, workers }, date, center, treatments) {
        const calendar = getCalendar({ calendars }, date);
        const day = calendar.week[new Date(date).getDay()];
        const wks = getWorkers({ calendars }, date, center);
        return treatments
            .filter(t => t.favourite)
            .filter(t => day.filter(arr => arr.length && Number(t[workers[arr[1]].column]) > 0).length)
            .map(t => Object.assign({
                available: day.filter(arr => arr.length && Number(t[workers[arr[1]].column]) > 0 && wks.indexOf(arr[1]) !== -1).length > 0
            }, t));
    },
    getTreatmentsDuration: getTreatmentsDuration,
    decimalToTime: decimalToTime,
    getAvailableHours: function (db, date, center, treatments, selTreatments, freeBusy) {
        const hours = [];
        const workers = getWorkers(db, date, center);
        const { timestamp } = db;
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
                            dt.setUTCHours(...decimalToTime(h, -2));
                            const hStart = new Date(dt);
                            dt.setUTCHours(...decimalToTime(h + duration, -2));
                            const hEnd = new Date(dt);
                            const filter = busy.filter(function ({ start, end }) {
                                const bStart = new Date(start);
                                const bEnd = new Date(end);
                                return (bStart >= hEnd) || (bEnd <= hStart);
                            });
                            if (filter.length === busy.length && hStart.getTime() > new Date(timestamp).getTime()) {
                                hours.push(h);
                            }
                        }
                    });
            });
        return hours.filter((h, i, a) => a.indexOf(h) === i).sort();
    },
    getLocation: function (db, date, googleId) {
        const cal = getCalendar(db, date);
        const workerIndex = db.workers.find(w => w.googleId === googleId).index;
        const bookDate = new Date(date);
        const filter = cal.week[(bookDate.getDay())]
            .filter(a => a[1] === workerIndex)
            .filter(a => {
                const start = new Date(date);
                start.setUTCHours(...decimalToTime(a[2], -2));
                return start.getTime() <= bookDate.getTime();
            })
            .filter(a => {
                const end = new Date(date);
                end.setUTCHours(...decimalToTime(a[3], -2));
                return end.getTime() > bookDate.getTime();
            });
        return filter.length ? db.centers.find(c => c.index === filter[0][0]) : 'NO LOCATION';
    },
    getPromotionDiscounts: getPromotionDiscounts,
    getDiscountsPrice: function (store, discounts) {
        return discounts
            .reduce((t1, d) => t1 + d.items
                .reduce((t2, i) => {
                    const price = i.count * store[storeTypes[i.type]].find(o => o.identificador === i.id).precio;
                    return t2 + roundDiscount(price, d.discount);
                }, 0), 0);
    },
    getDiscountsItems: getDiscountsItems,
    getCartTotal: function cartTotal(store, cart) {
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
        }, { discounted: [], notDiscounted: cart.slice(0) });
        const notDiscounted = items.notDiscounted.reduce((t, id) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + Number(it.precio);
        }, 0);
        const discounted = items.discounted.reduce((t, { id, discount }) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + roundDiscount(Number(it.precio), discount);
        }, 0);
        const real = cart.reduce((t, id) => {
            const type = storeTypes[id.substr(0, 3)];
            const it = store[type].find(i => i.identificador === id);
            return t + Number(it.precio);
        }, 0);
        return { total: notDiscounted + discounted, discount: real - notDiscounted - discounted, real };
    },
    sortByDate: sortByDate,
    activePromotions: activePromotions
};