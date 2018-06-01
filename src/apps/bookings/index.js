import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import hourTemplate from './hour.html';
import createAnAccountTemplate from '../../common/createAnAccount.html';
import treatmentTemplate from './treatment.html';
import noTreatmentsTemplate from './no-treatments.html';
import * as styles from './index.scss';

function bookings({ system }) {
    return async function ({ parent, thread, wait }) {
        const obj = {};
        const maximumDays = 10;
        const centers = system.store.centers;
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/globalize/es.json`);
        await locale.load(`/localization/common/es.json`);
        await locale.load(`/localization/bookings/es.json`);
        const parentView = HtmlView('<div></div>', []);
        parent.appendChild(parentView.get());
        let view;
        let freeBusy = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneDayMs = 1000 * 60 * 60 * 24;
        const now = Date.now();
        const model = ({
            center: 0,
            treatments: [],
            date: 0,
            progress: 0
        }).reactive();

        const days = [locale.get('day_today'), locale.get('day_tomorrow')]
            .concat(new Array(maximumDays - 2).fill(0).map((v, i) => {
                const dt = new Date(now + oneDayMs * (i + 2));
                return `${locale.get('day_' + dt.getDay())} ${dt.formatDay('dd/mm')}`;
            }));
        let availableDays = getAvailableDays(centers.salitre.opening);
        model.date = availableDays[0].timestamp;

        const disc1 = ({
            logged: () => system.store.logged,
            trt: () => system.store.treatments
        }).reactive().connect(({ logged, trt }) => {
            parentView.clear();
            if (!logged) {
                view = parentView.appendTo('', createAnAccountTemplate, [], locale.get());
            } else if (!system.store.treatments.filter(t => t.favourite).length) {
                view = parentView.appendTo('', noTreatmentsTemplate, [], locale.get());
            } else {
                view = parentView.appendTo('', template, styles, locale.get());

                view.get('booking').go = function (id, checked) {
                    if (checked && model.treatments.indexOf(id) === -1) {
                        model.treatments.push(id);
                    } else if (!checked && model.treatments.indexOf(id) !== -1) {
                        model.treatments.splice(model.treatments.indexOf(id), 1);
                    }
                    appendHours();
                };
                view.get('booking').next = () => {
                    const d = availableDays.filter(i => i.timestamp === model.date)[0];
                    const next = availableDays[d.index + 1];
                    if (next) {
                        model.date = next.timestamp;
                    }
                };
                view.get('booking').prev = () => {
                    const d = availableDays.filter(i => i.timestamp === model.date)[0];
                    const prev = availableDays[d.index - 1];
                    if (prev) {
                        model.date = prev.timestamp;
                    }
                };
                view.get('booking').book = async function () {
                    if (this.hour && this.hour.value !== '') {
                        const hour = (this.hour.length
                            ? Array.prototype.slice.call(this.hour).filter(i => i.checked)[0].value
                            : this.hour.value).split(':');
                        system.store.loading = true;
                        const book = await thread.execute('booking/insert', { model, hour });
                        system.store.bookings.push(book);
                        system.store.loading = false;
                        await new Promise(r => setTimeout(r, 200));
                        system.navigateTo(locale.get('urls.loginHome'));
                    }
                };

                view.get('booking').goToCenter = (index) => {
                    const centerName = Object.keys(centers).filter(key => centers[key].index === index)[0];
                    const center = centers[centerName];
                    availableDays = getAvailableDays(center.opening);
                    model.center = center.index;
                    model.date = availableDays[0].timestamp;
                    appendHours();
                };
            }
        });


        const disconnect = ({
            deviceType: () => system.deviceInfo().deviceType,
            width: () => system.deviceInfo().width,
            orientation: () => system.deviceInfo().orientation,
            progress: () => model.progress,
            workerId: () => model.workerId,
            date: () => model.date,
            center: () => model.center,
            logged: () => system.store.logged,
            trt: () => system.store.treatments
        })
            .reactive()
            .connect(async function ({ width, orientation, date, trt, logged }, changedKey) {
                if (logged && trt.filter(t => t.favourite).length) {
                    view.style(orientation);
                    const filter = availableDays.filter(i => i.timestamp === date);
                    if (filter.length)
                        view.get('date').innerText = filter[0].label;
                    const promise = callServer(changedKey === 'date');
                    appendTreatments(promise);
                    if (changedKey === 'date') appendHours(promise);
                }
            });

        obj.destroy = function () {
            disconnect();
            disc1();
        };

        function getAvailableDays(opening) {
            return new Array(maximumDays).fill(0).map((v, i) => i)
                .filter(i => opening.indexOf(new Date(now + oneDayMs * i).getDay()) !== -1)
                .map((i, index) => {
                    return {
                        label: days[i],
                        timestamp: new Date(now + oneDayMs * i).getTime(),
                        index
                    };
                });
        }


        async function callServer(hasDateChanged) {
            freeBusy = await thread.execute('booking/get-hours', { hasDateChanged, date: model.date });
            const key = Object.keys(centers).filter(key => centers[key].index === model.center)[0];
            return {
                treatments: system.store.treatments
                    .filter(i => i.favourite === true)
                    .filter(i => {
                        return centers[key].workers.filter(w => i[w] !== '0').length > 0;
                    })
                    .map(({ identificador, titulo, tipo }) => {
                        return { id: identificador, label: `${tipo}: ${titulo}` };
                    }) || [],
                freeBusy
            };
        }

        function decimalToTime(decimalTimeString) {
            const n = new Date(0, 0);
            n.setSeconds(+decimalTimeString * 60 * 60);
            return n.toTimeString().slice(0, 8).split(':').concat([0]).map(e => parseInt(e, 10));
        }

        function getDuration(worker) {
            return model.treatments.reduce((a, b) => {
                const dur = Number(system.store.treatments
                    .filter(item => item.identificador == b)[0][worker]);
                a += (dur === 0) ? -20000000 : dur;
                return a;
            }, 0);
        }

        function getHoursNested(w, dateToEval, duration, minutes) {
            return system.store.calendars
                .find(c => c.worker === w).week[dateToEval.getDay()].periods
                .map((arr) => {
                    const start = arr[0];
                    const end = new Date(model.date);
                    end.setHours(...decimalToTime(arr[1]));
                    const date = new Date(model.date);
                    date.setHours(...decimalToTime(start));
                    const hours = [];
                    while ((new Date(date.getTime() + (duration * 60 * 1000))).getTime() <= end.getTime()) {
                        if (freeBusy[w]) {
                            const intersect = !!(freeBusy[w].filter(busy => {
                                return ((date.getTime() < (new Date(busy.end)).getTime()) &&
                                    ((new Date(date.getTime() + (duration * 60 * 1000))).getTime() > (new Date(busy.start)).getTime()));
                            }).length);
                            if (!intersect && date.getTime() > Date.now()) {
                                hours.push(date.getHours() + ':' + date.getMinutes().toString().padLeft(2, '0'));
                            }
                        }
                        date.setTime(date.getTime() + (minutes * 60 * 1000));
                    }
                    return hours;
                }).reduce((ret, arr) => ret.concat(arr), []);
        }

        function getHours(centerName, minutes, dateToEval) {
            return centers[centerName].workers
                .map(function (w) {
                    const duration = getDuration(w);
                    return duration > 0
                        ? getHoursNested(w, dateToEval, Math.ceil(duration / minutes) * minutes, minutes) : [];
                })
                .reduce((ret, arr) => ret.concat(arr), [])
                .sort((a, b) => new Date(`01-01-2000 ${a}`).getTime() - new Date(`01-01-2000 ${b}`).getTime())
                .filter((item, pos, self) => self.indexOf(item) === pos)
                .filter(item => item);
        }

        // TODO: fix hours
        async function appendHours(promise) {
            const minutes = 15;
            view.get('hours').innerHTML = ``;
            if (model.treatments.length) {
                view.get('hours').innerHTML = `<img style="width: 33px" src="/assets/images/loading.gif" />`;
                if (promise) await promise;
                const centerName = Object.keys(centers).filter(key => centers[key].index === model.center)[0];
                const hours = getHours(centerName, minutes, new Date(model.date));
                view.get('hours').innerHTML = ``;
                hours.forEach((item, index) => {
                    view.appendTo('hours', hourTemplate, [], { index, item });
                });
            }
        }

        async function appendTreatments(promise) {
            view.get('treatments').innerHTML = `<img style="width: 33px" src="/assets/images/loading.gif" />`;
            const { treatments } = await promise;
            view.get('treatments').innerHTML = ``;
            treatments.forEach((item, index) => {
                const checked = model.treatments.indexOf(item.id) !== -1 ? 'checked' : '';
                view.appendTo('treatments', treatmentTemplate, [], { item, index, checked });
            });
            const toRemove = model.treatments.filter(id => {
                return treatments.filter(i => i.id == id).length === 0;
            });
            toRemove.forEach(i => {
                model.treatments.splice(model.treatments.indexOf(i), 1);
            });
        }


        return obj;
    };
}

plugin(bookings);