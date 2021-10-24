import { plugin } from 'gml-system';
import { HtmlStyle, HtmlView, Node } from 'gml-html';
import template from './index.html';
import hoursTemplate from './hours.html';
import createAnAccountTemplate from '../../common/createAnAccount.html';
import treatmentTemplate from './treatment.html';
import noTreatmentsTemplate from './no-treatments.html';
import * as styles from './index.scss';
import {
    decimalToTime,
    getAvailableHours,
    getCenters,
    getTreatments,
    isCenterClosed
} from '../../../web-app-deploy/shared';

function toLocalTime(date, system) {
    return new Date(new Date(date).getTime() - (( - system.store.localOffset) * 60 * 60 * 1000)).getTime();
}

function bookings({ system }) {
    return async function ({ parent, thread, wait }) {
        const obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/globalize/es.json`);
        await locale.load(`/localization/common/es.json`);
        await locale.load(`/localization/bookings/es.json`);
        const parentView = HtmlView('<div></div>', []);
        parent.appendChild(parentView.get());
        const dayNames = [0, 1, 2, 3, 4, 5, 6].map(i => locale.get(`day_${i}`));
        const monthNames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => locale.get(`month_${i}`));

        let view;
        const maximumDays = 14;
        const oneDayMs = 1000 * 60 * 60 * 24;
        const model = system.book;

        const disc1 = window.rx.connect({
            logged: () => system.store.hasLogged,
            trt: () => system.store.treatments
        }, ({ logged, trt }) => {
            parentView.clear();
            if (!logged) {
                view = parentView.appendTo('', createAnAccountTemplate, [], locale.get());
            } else if (!system.store.treatments.filter(t => t.favourite).length) {
                view = parentView.appendTo('', noTreatmentsTemplate, [], locale.get());
            } else {
                view = parentView.appendTo('', template, styles, locale.get());
                view.get('booking').selectTreatment = function (id, checked) {
                    if (checked) {
                        model.treatments.push(id);
                    } else {
                        model.treatments.splice(model.treatments.indexOf(id), 1);
                    }
                };
                view.get('booking').next = () => {
                    const calcDay = new Date(model.date + oneDayMs).getDay();
                    model.date = model.date + oneDayMs * (calcDay === 0 ? 2 : 1);
                };
                view.get('booking').prev = () => {
                    const calcDay = new Date(model.date - oneDayMs).getDay();
                    model.date = model.date - oneDayMs * (calcDay === 0 ? 2 : 1);
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
                        model.treatments.splice(0, model.treatments.length);
                        await new Promise(r => setTimeout(r, 200));
                        system.navigateTo(locale.get('urls.loginHome'));
                    }
                };
                view.get('booking').goToCenter = (index) => {
                    model.center = index;
                };
                view.get('booking').enableButton = () => {
                    view.get('book').removeAttribute('disabled');
                };
            }
        });


        function appendCenters(centers) {
            view.clear('centers');
            centers.forEach(function (index) {
                view.appendTo('centers', `
                        <output class="text-checkbox" onclick="this.form.goToCenter(${index})">
                            <input type="radio" name="center" id="center_${index}" ${model.center === index ? 'checked' : ''} />
                            <label class="clickable" for="center_${index}">{{center}} ${system.store.centers[index].label}</label>
                        </output>
                    `, styles, locale.get());
            });
        }

        function appendTreatments(treatments) {
            view.clear('treatments');
            treatments.forEach((item, index) => {
                const checked = model.treatments.indexOf(item.identificador) !== -1 ? 'checked' : '';
                const availableText = item.available ? '' : 'DISPONIBLE EN OTRO CENTRO';
                const availableDisabled = item.available ? '' : 'disabled';
                view.appendTo('treatments', treatmentTemplate, [], {
                    item,
                    index,
                    checked,
                    availableText,
                    availableDisabled
                });
            });
        }

        function refreshButtons() {
            if (model.date <= system.store.spainTime + (new Date(system.store.spainTime).getDay() === 0 ? oneDayMs : 0)) {
                view.get('prev').setAttribute('disabled', 'disabled');
            } else {
                view.get('prev').removeAttribute('disabled');
            }
            if (model.date >= system.store.spainTime + (maximumDays * oneDayMs)) {
                view.get('next').setAttribute('disabled', 'disabled');
            } else {
                view.get('next').removeAttribute('disabled');
            }
        }

        const disconnect = window.rx.connect({
            deviceType: () => system.deviceInfo().deviceType,
            orientation: () => system.deviceInfo().orientation,
            progress: () => model.progress,
            workerId: () => model.workerId,
            date: () => model.date,
            center: () => model.center,
            logged: () => system.store.hasLogged,
            trt: () => system.store.treatments,
            mTrt: () => model.treatments
        }, async function ({ orientation, date, trt, center, logged, mTrt }) {
            if (logged && trt.filter(t => t.favourite).length) {
                view.style(orientation);
                const centers = getCenters(system.store, toLocalTime(date, system)).filter(c => c !== undefined).sort();
                const treatments = getTreatments(system.store, toLocalTime(date, system), center, trt);
                const selTreatments = mTrt.filter(id => {
                    const t = treatments.find(t => t.identificador === id);
                    return t && t.available;
                });
                view.get('date').innerText = new Date(date).formatDay('dddd dd/mm', dayNames);
                refreshButtons();
                if (isCenterClosed(system.store, center, toLocalTime(date, system))) {
                    view.clear('hours').appendTo('hours', `<div>CERRADO</div>`);
                    view.clear('treatments');
                    return;
                }
                appendCenters(centers);
                appendTreatments(treatments);
                view.clear('hours').appendTo('hours', '<div>SELECIONA UNO O MAS TRATAMIENTOS</div>', []);
                view.get('book').setAttribute('disabled', 'disabled');
                if (selTreatments.length && centers.filter(c => c === center).length) {
                    view.clear('hours').appendTo('hours', '<div style="text-align: center; width: 100%"><img style="width: 33px" src="/assets/images/loading.gif" /></div>', []);
                    const localDate = toLocalTime(date, system);
                    console.warn({ date: localDate, treatments: selTreatments, center })
                    const freeBusy = await thread.execute('booking/get-hours',
                        { date: localDate, treatments: selTreatments, center });
                    system.store.serverTimestamp += 2 * 60 * 60 * 1000;
                    const hours = getAvailableHours(system.store, localDate, center, treatments, selTreatments, freeBusy)
                        .map(h => decimalToTime(h).splice(0, 2).map(i => i.toString().padLeft(2, '0')).join(':'));
                    system.store.serverTimestamp -= 2 * 60 * 60 * 1000;
                    if (hours.length) {
                        view.clear('hours').appendTo('hours', hoursTemplate, [], { hours });
                    } else {
                        view.clear('hours').appendTo('hours', '<div>Lo sentimos...hoy estamos completos para realizar este servicio</div>', [], {});
                    }
                }
            }
        });

        const timer = window.rx.connect({ t: () => system.store.spainTime, trt: () => system.store.treatments }, function ({ t, trt }) {
            if (system.store.logged && view.get('spain') && trt.filter(t => t.favourite).length)
                {
                    const spainStartTime = new Date().toLocaleString('es-ES', {
                        timeZone: 'Europe/Madrid',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric'
                    });

                    view.get('spain').innerText = `Malaga: ${spainStartTime}`;
                }
        });

        obj.destroy = function () {
            disconnect();
            timer();
            disc1();
        };

        return obj;
    };
}

plugin(bookings);
