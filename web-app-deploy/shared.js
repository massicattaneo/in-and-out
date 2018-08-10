function getCalendar({ calendars }, date) {
    const d = new Date(date).getTime();
    return calendars.find(c => {
        const end = new Date(c.to);
        end.setUTCHours(23,59,59,99);
        return new Date(c.from).getTime() < d && end.getTime() > d
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
            const from = new Date(date); from.setUTCHours(...decimalToTime(d[2], -2));
            const to = new Date(date); to.setUTCHours(...decimalToTime(d[3], -2));
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
        start.setHours(0,0,0);
        const res = calendars
            .filter(c => end.getTime() > new Date(c.from))
            .filter(c => start.getTime() <= new Date(c.to))
            .map(c => Object.assign(c, {closed: c.week.filter(day => day.filter(worker => worker[0] === centerIndex).length).length === 0}));
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
    }
};