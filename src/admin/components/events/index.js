import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import miniCalTpl from './mini-calendar.html';
import * as miniCalStyle from './mini-calendar.scss';
import dayTpl from './day.html';
import hourTpl from './hour.html';
import processTpl from './process.html';
import editEvent from './edit-event.html';
import editNote from './edit-note.html';
import eventTpl from './event.html';
import { createModal } from '../../utils';
import { getCalendar } from '../../../../web-app-deploy/shared';

const stepHeight = 13;
const minPeriod = 15;
const topOffset = 60;
const startHour = 9;
const startMinutes = 30;
let clipboard;

function timeToDecimal(t) {
    const arr = t.split(':');
    return parseFloat(parseInt(arr[0], 10) + '.' + parseInt((arr[1] / 6) * 10, 10));
}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function createEvent(params) {
    const def = {
        worker: '',
        attendees: [],
        summary: '',
        id: '',
        processId: 99,
        duration: minPeriod,
        date: Date.now(),
        description: '',
        label: ''
    };
    const assign = Object.assign(def, params);
    const date = new Date(def.date);
    date.setHours(startHour, startMinutes, 0, 0);
    const number = (new Date(def.date).getTime() - date.getTime()) / (15 * 60 * 1000);
    assign.top = number * stepHeight + topOffset;
    assign.height = stepHeight * (def.duration / minPeriod);
    assign.json = JSON.stringify(assign);
    return assign;
}

export default async function ({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);
    const form = view.get('wrapper');
    const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));
    const monthNames = new Array(12).fill(0).map((v, i) => locale.get(`month_${i}`).substr(0, 4));
    const dayViews = {};
    view.style(system.deviceInfo().deviceType);

    const miniView = view.appendTo('minicalendar', miniCalTpl, miniCalStyle);
    miniView.style();


    if (system.deviceInfo().deviceType === 'desktop')
        system.publicDb.processes.forEach(function (p) {
            view.appendTo('processes', processTpl, [], p);
        });
    else
        view.get('processes').parentNode.removeChild(view.get('processes'));

    form.changeDate = function () {
        const d = new Date(system.store.date);
        d.setDate(window.event.target.value);
        system.store.date = d.getTime();
    };
    form.back = function () {
        const d = new Date(system.store.date);
        d.setMonth(d.getMonth() - 1);
        system.store.date = d.getTime();
    };
    form.forward = function () {
        const d = new Date(system.store.date);
        d.setMonth(d.getMonth() + 1);
        system.store.date = d.getTime();
    };
    form.dragEnter = function () {
        window.event.target.classList.add('hover');
    };
    form.dragLeave = function () {
        window.event.target.classList.remove('hover');
    };
    form.dragOver = function () {
        window.event.preventDefault();
    };
    form.drop = function ({ worker }, config) {
        const target = window.event.target;
        target.classList.remove('hover');
        const params = config || JSON.parse(window.event.dataTransfer.getData('config'));
        if (params.userAction === 'move') {
            thread.execute('booking/delete', {
                eventId: params.id,
                calendarId: system.publicDb.workers.find(c => c.column === worker).googleId
            });
        }

        const date = new Date(params.date || system.store.date);
        const id = config ? config.id : '';
        const hour = (params.date && params.userAction !== 'move')
            ? [new Date(date).getHours(), new Date(date).getMinutes()]
            : target.innerText.split(':').map(i => Number(i));
        date.setHours(hour[0], hour[1], 0, 0);
        const dbWorker = system.publicDb.workers.find(c => c.column === worker);

        const displayName = dbWorker.title;
        const e = createEvent(Object.assign(params, {
            id,
            worker,
            date,
            attendees: [{ displayName, organizer: true }]
        }));
        const modalView = HtmlView(editEvent, {}, e);
        const modal = modalView.get();
        document.getElementById('modal').appendChild(modal);
        modal.showModal();
        componentHandler.upgradeDom();
        modalView.get('date').valueAsNumber = date.getTime() - (new Date().getTimezoneOffset()) * 60 * 1000;
        modalView.get('summary').focus();
        modalView.get('summary').setSelectionRange(0, modalView.get('summary').value.length);

        async function saveForm() {
            if (e.id) {
                await thread.execute('booking/delete', {
                    eventId: e.id,
                    calendarId: dbWorker.googleId
                });
            }
            const evt = createEvent(Object.assign({}, e, {
                summary: this.summary.value,
                duration: this.duration.value,
                date: this.date.valueAsNumber + (new Date().getTimezoneOffset()) * 60 * 1000,
            }));
            await thread.execute('booking/add', {
                duration: evt.duration * 60 * 1000,
                calendarId: dbWorker.googleId,
                date: new Date(evt.date).toISOString(),
                summary: evt.summary,
                processId: evt.processId,
                description: evt.description,
                label: evt.label
            });
            close();
        }

        modalView.get('form').save = saveForm;
        modalView.get('form').close = close;
        modalView.get('form').delete = function (worker, eventId) {
            thread.execute('booking/delete', {
                eventId: eventId,
                calendarId: system.publicDb.workers.find(i => i.column === worker).googleId
            });
            close();
        };

        function enterKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveForm.call(modalView.get('form'));
            }
        }

        window.addEventListener('keydown', enterKey);

        function close() {
            modal.close();
            window.removeEventListener('keydown', enterKey);
        }
    };
    form.dragStart = function (params, type = 'new') {
        params.userAction = type;
        window.event.dataTransfer.setData('config', JSON.stringify(params));
    };
    form.clipboard = function (d) {
        clipboard = d;
        if (system.store.keysPressed.indexOf('x') !== -1) {
            thread.execute('booking/delete', {
                eventId: d.id,
                calendarId: system.publicDb.workers.find(i => i.column === d.worker).googleId
            });
        }
    };
    form.paste = function ({ worker }) {
        const target = window.event.target;
        const date = new Date(system.store.date);
        const hour = target.innerText.split(':').map(i => Number(i));
        date.setHours(hour[0], hour[1], 0, 0);
        if (system.store.keysPressed.indexOf('v') !== -1 && clipboard) {
            thread.execute('booking/add', {
                duration: clipboard.duration * 60 * 1000,
                calendarId: system.publicDb.workers.find(i => i.column === worker).googleId,
                date: date.toISOString(),
                summary: clipboard.summary,
                processId: clipboard.processId,
                description: clipboard.description,
                label: clipboard.label
            });
        }
    };
    form.editNote = function ({ worker }) {
        const noteDate = new Date(system.store.date);
        noteDate.setHours(20, 30, 0, 0);
        const items = system.publicDb.workers.find(c => c.column === worker).items || [];
        const event = items.find(i => i.start.dateTime.indexOf('T20:30:00+02:00') !== -1) || {};
        const { modalView } = createModal(editNote, { note: event.summary || '' }, async function (close) {
            if (event.id) {
                await thread.execute('booking/delete', {
                    eventId: event.id,
                    calendarId: system.publicDb.workers.find(i => i.column === worker).googleId
                });
            }
            await thread.execute('booking/add', {
                duration: 60 * 60 * 1000,
                calendarId: system.publicDb.workers.find(i => i.column === worker).googleId,
                date: noteDate.toISOString(),
                summary: this.note.value,
                processId: 96,
                description: '',
                label: ''
            });
            close();
        });
        modalView.get('form').delete = async function () {
            if (event.id) {
                await thread.execute('booking/delete', {
                    eventId: event.id,
                    calendarId: system.publicDb.workers.find(i => i.column === worker).googleId
                });
            }
            modalView.get('close').click();
        };
    };
    view.destroy = function () {

    };

    window.rx.connect({ search: () => system.store.search }, function ({ search }) {
        if (system.store.logged)
            drawCalendars(search, false);
    });

    window.rx.connect({ date: () => system.store.date }, function ({ date }) {
        changeMiniCalendarDate(new Date(date));
        if (system.store.logged)
            drawCalendars(system.store.search);
    });

    window.rx.connect({ keys: () => system.store.keysPressed }, function ({ keys }) {
        if (keys.indexOf('ArrowRight') !== -1 && keys.indexOf('Shift') !== -1) {
            system.store.date += 24 * 60 * 60 * 1000;
        }
        if (keys.indexOf('ArrowLeft') !== -1 && keys.indexOf('Shift') !== -1) {
            system.store.date -= 24 * 60 * 60 * 1000;
        }
        if (keys.indexOf('ArrowUp') !== -1 && keys.indexOf('Shift') !== -1) {
            system.store.date -= 7 * 24 * 60 * 60 * 1000;
        }
        if (keys.indexOf('ArrowDown') !== -1 && keys.indexOf('Shift') !== -1) {
            system.store.date += 7 * 24 * 60 * 60 * 1000;
        }
    });

    function isWorkDay(date) {
        return date.getDay() !== 0;
    }

    async function getServerDayEvents(callServer, c) {
        if (callServer) {
            const { items } = await thread.execute('booking/get', {
                date: new Date(system.store.date),
                calendarId: c.googleId
            });
            return items;
        }
        return c.items || [];
    }

    function drawCalendars(search, callServer = true) {
        const calendar = getCalendar(system.publicDb, system.store.date);
        system.publicDb.workers.forEach(async function (c) {
            const dayView = view.clear(c.column).appendTo(c.column, dayTpl, [], c);
            dayView.style();
            c.items = await getServerDayEvents(callServer, c);

            (new Array(43)).fill(0).forEach(function (zero, index) {
                const d = new Date(system.store.date);
                d.setHours(startHour, startMinutes, 0, 0);
                d.setTime(d.getTime() + (index * minPeriod * 60 * 1000));

                const ttd = timeToDecimal(`${d.getHours().toFixed(2)}:${d.getMinutes().toFixed(2)}`);
                const day = calendar.week[d.getDay()].filter(arr => arr[1] === c.index);
                const find = day.find((arr) => ttd >= arr[2] && ttd < arr[3]);
                if (find) {
                    dayView.appendTo('wrapper', hourTpl, {}, {
                        label: d.formatTime('hh:mm'),
                        top: (stepHeight * index) + topOffset,
                        height: stepHeight,
                        worker: c.column,
                        bgColor: system.publicDb.centers.find(c => c.index === find[0]).color
                    });
                }
            });

            c.items.forEach(function ({ id, start, end, description, summary, extendedProperties, attendees }) {
                const processId = extendedProperties && extendedProperties.private && extendedProperties.private.processId;
                const label = extendedProperties && extendedProperties.private && extendedProperties.private.label;
                const startTime = new Date(start.dateTime).getTime();
                const endTime = new Date(end.dateTime).getTime();
                const duration = Math.ceil((endTime - startTime) / (60 * 1000));
                const e = createEvent({
                    id,
                    worker: c.column,
                    processId,
                    summary,
                    description,
                    attendees,
                    date: startTime,
                    duration,
                    label
                });
                if (!search || summary.toLowerCase().indexOf(search) !== -1)
                    dayView.appendTo('wrapper', eventTpl, [], e);
            });
            dayViews[c.column] = dayView;
        });
        componentHandler.upgradeDom();
    }

    function changeMiniCalendarDate(dt) {
        const m = dt.getMonth() + 1, y = dt.getFullYear(), d = dt.getDate();
        const month = m;
        const year = y;
        let day = 1;

        let date = new Date(`${year}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}`);
        console.warn(year, month, day);
        const today = new Date();
        miniView.get('month').innerText = (new Date(`${year}-${month.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}`)).formatDay('mmm yy', [], monthNames);
        today.setHours(0, 0, 0, 0);
        [1, 2, 3, 4, 5, 6].forEach(function (r) {
            [0, 1, 2, 3, 4, 5, 6].forEach(function (c) {
                const node = miniView.get(`${r}_${c}`);
                node.innerText = '';
                node.classList.remove('work');
                node.classList.remove('selected');
                node.classList.remove('old');
                node.setAttribute('data-day', '');
                if (c === date.getDay() && date.getMonth() === month - 1) {
                    if (d === date.getDate()) node.classList.add('selected');
                    date = new Date(`${year}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}`);
                    if (today.getTime() > date.getTime()) node.classList.add('old');
                    if (isWorkDay(date)) {
                        node.classList.add('work');
                    }
                    node.innerText = (date.getDate());
                    node.setAttribute('data-day', date.getDate());
                    date = new Date(`${year}-${month.toString().padLeft(2, '0')}-${(++day).toString().padLeft(2, '0')}`);
                }
            });
        });
    }

    view.remove = function (calendarId, eventId) {

        const dbWorker = system.publicDb.workers.find(c => c.googleId === calendarId);
        if (!dayViews[dbWorker.column]) return;
        const item = document.getElementById(eventId);
        if (!item) return;
        item.parentNode.removeChild(item);
    };

    view.add = function (ev) {
        const dbWorker = system.publicDb.workers.find(c => c.googleId === ev.calendarId);
        if (!dayViews[dbWorker.column]) return;
        if (!sameDay(new Date(system.store.date), new Date(ev.start))) return;
        dayViews[dbWorker.column].appendTo('wrapper', eventTpl, [], createEvent(Object.assign({ worker: dbWorker.column }, ev)));
    };

    return view;
}
