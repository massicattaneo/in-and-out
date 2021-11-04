import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import miniCalTpl from './mini-calendar.html';
import * as miniCalStyle from './mini-calendar.scss';
import dayTpl from './day.html';
import hourTpl from './hour.html';
import processTpl from './process.html';
import editHolidays from './edit-holidays.html';
import editEvent from './edit-event.html';
import editNote from './edit-note.html';
import editHours from './edit-hours.html';
import eventTpl from './event.html';
import { createModal } from '../../utils';
import { getCalendar, getSpainOffset } from '../../../../web-app-deploy/shared';

const stepHeight = 13;
const minPeriod = 15;
const topOffset = 7;
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

function reverseLocalTime(date, system) {
    return new Date(new Date(date).getTime() - (getSpainOffset(date) - system.store.localOffset) * 60 * 60 * 1000).getTime();
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

    const onResize = () => {
        const height = window.innerHeight - view.get('minicalendar').getBoundingClientRect().height
        view.get('calendar').style.height = `${height - 70}px`
    }
    window.addEventListener('resize', onResize)

    if (system.deviceInfo().deviceType === 'desktop')
        system.publicDb.processes.forEach(function (p) {
            view.appendTo('processes', processTpl, [], p);
        });
    else {
        view.get('processes').parentNode.removeChild(view.get('processes'));
        view.get('central').parentNode.removeChild(view.get('central'));
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
        if (params.treatments && (typeof params.treatments !== 'string')) {
            params.treatments = JSON.stringify(params.treatments)
        }
        const assign = Object.assign(def, params);
        assign.treatments = JSON.parse(assign.treatments || JSON.stringify([]))
        const date = new Date(def.date);
        date.setUTCHours(startHour, startMinutes, 0, 0);
        const number = (new Date(def.date).getTime() - date.getTime() + (getSpainOffset(date) * 60 * 60 * 1000)) / (15 * 60 * 1000);
        assign.top = number * stepHeight + topOffset;
        if ((assign.processId || '').toString() !== '96') {
            assign.height = stepHeight * (def.duration / minPeriod);
        }
        assign.json = JSON.stringify(assign);
        return assign;
    }

    // system.store.date = new Date(toLocalTime(system.store.date, system));

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
    form.cartDragOver = function (type) {
        window.event.preventDefault();
        view.get(type).style['border-style'] = 'solid';
    };
    form.cartDragLeave = function (type) {
        window.event.preventDefault();
        view.get(type).style['border-style'] = 'dotted';
    };
    form.cartDrop = function (type) {
        window.event.preventDefault();
        view.get(type).style['border-style'] = 'dotted';
        const config = JSON.parse(window.event.dataTransfer.getData('config'));
        const treatment = system.publicDb.treatments.find(item => item.identificador === config.itemKey);
        const client = system.store.clients.find(user => user.email === config.description);
        if (type === 'cart') {
            dropToCart(thread, config, client, locale, system, treatment);
        } else if (type === 'client' && config.action !== 'add') {
            if (client) {
                system.navigateTo(`${locale.get('urls.history.href')}?id=${client._id}`);
            } else {
                const [phone = ''] = config.summary.match(/\d+\s?\d+\s?\d+\s?\d+\s?\d+/g) || []
                if (phone.length > 5) {
                    const client1 = system.store.clients.find(user => {
                        const tel = user.tel.toString().replace(/\s/g, '')
                        return tel.indexOf(phone.replace(/\s/g, '')) !== -1;
                    });
                    if (client1) {
                        system.navigateTo(`${locale.get('urls.history.href')}?id=${client1._id}`);
                    }
                } else {
                    const client2 = system.store.clients.filter(client => {
                        return config.summary.toLowerCase().indexOf(client.name.toLowerCase()) !== -1
                    })
                    const client3 = client2.filter(client => {
                        const parts = client.surname.toLowerCase().split(' ')
                        return parts.some(text => text.trim() && config.summary.toLowerCase().indexOf(text.trim()) !== -1)
                    })
                    if (client2.length === 1) {
                        system.navigateTo(`${locale.get('urls.history.href')}?id=${client2[0]._id}`);
                    } else if (client3.length === 1) {
                        system.navigateTo(`${locale.get('urls.history.href')}?id=${client3[0]._id}`);
                    }
                }
                
            }
        }
    };
    form.drop = function ({ worker }, config) {
        const target = window.event.target;
        target.classList.remove('hover');
        const params = config || JSON.parse(window.event.dataTransfer.getData('config'));
        
        const configToRemove = Object.assign({}, params);
        const date = new Date(params.date || reverseLocalTime(system.store.date, system));
        const offDate = (!params.action && !params.userAction) ? 0 :getSpainOffset(date) - getSpainOffset();
        const id = config ? config.id : '';
        const hour = (params.date && params.userAction !== 'move')
            ? [new Date(date).getHours(), new Date(date).getMinutes()]
            : target.innerText.split(':').map(i => Number(i));
        const dbWorker = system.publicDb.workers.find(c => c.column === worker);
        if (params.processId === 99 && params.summary === 'dia libre' && params.action === 'add') {
            const calendar = getCalendar(system.publicDb, date);
            const pepe = calendar.week[new Date(date).getDay()].find(item => item[1] === dbWorker.index)
            hour[0] = Math.floor(pepe[2])
            hour[1] = 60 * (pepe[2] - Math.floor(pepe[2]))
            params.duration = (pepe[3] - pepe[2]) * 60
            date.setHours(hour[0], hour[1], 0, 0);
            return thread.execute('booking/add', {
                duration: params.duration * 60 * 1000,
                calendarId: dbWorker.googleId,
                date: new Date(date).toISOString(),
                summary: params.summary,
                processId: params.processId,
                description: params.description,
                label: params.label,
                treatments: []
            });
        } else if (params.processId === 99 && params.summary === 'festivo' && params.action === 'add') {
            const calendar = getCalendar(system.publicDb, date);
            const dayCal = calendar.week[new Date(date).getDay()]
            dayCal.forEach(cal => {
                const workerHere = system.publicDb.workers.find(c => c.index === cal[1]);
                const newDate = new Date(date)
                const newHour = hour.slice(0)
                newHour[0] = Math.floor(cal[2])
                newHour[1] = 60 * (cal[2] - Math.floor(cal[2]))
                const duration = (cal[3] - cal[2]) * 60
                newDate.setHours(newHour[0], newHour[1], 0, 0);
                thread.execute('booking/add', {
                    duration: duration * 60 * 1000,
                    calendarId: workerHere.googleId,
                    date: new Date(newDate).toISOString(),
                    summary: 'festivo',
                    processId: params.processId
                });
            })
            return
        } else if (params.processId === 99 && params.summary === 'vacaciones' && params.action === 'add') { 
            const modalView = HtmlView(editHolidays, {});
            const modal = modalView.get();
            document.getElementById('modal').appendChild(modal);
            modal.showModal();
            componentHandler.upgradeDom();
            modalView.get('start').valueAsNumber = date.getTime();
            modalView.get('end').valueAsNumber = date.getTime();

            async function saveForm() {
                close();
                const startDate = new Date(modalView.get('start').valueAsNumber)
                const endDate = new Date(modalView.get('end').valueAsNumber)
                endDate.setHours(23,0,0,0)
                for (var actualDate = new Date(startDate); actualDate <= endDate; actualDate.setDate(actualDate.getDate() + 1)) {
                    const calendar = getCalendar(system.publicDb, actualDate);
                    const cal = calendar.week[new Date(actualDate).getDay()].find(item => item[1] === dbWorker.index)
                    if (!cal) continue
                    hour[0] = Math.floor(cal[2])
                    hour[1] = 60 * (cal[2] - Math.floor(cal[2]))
                    const duration = (cal[3] - cal[2]) * 60
                    actualDate.setHours(hour[0], hour[1], 0, 0);
                    const addParams = {
                        duration: duration * 60 * 1000,
                        calendarId: dbWorker.googleId,
                        date: new Date(actualDate).toISOString(),
                        summary: params.summary,
                        processId: params.processId
                    };
                    thread.execute('booking/add', addParams);
                }
            }

            modalView.get('form').save = saveForm;
            modalView.get('form').close = close;
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

            return
        }
        date.setHours(hour[0] + getSpainOffset(date) + offDate, hour[1], 0, 0);
        if (params.processId === 99) {
            
        }
        if (params.userAction === 'new' || params.userAction === 'move') date.setTime(reverseLocalTime(date, system));
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
        modalView.get('date').valueAsNumber = date.getTime();
        modalView.get('summary').focus();
        modalView.get('summary').setSelectionRange(0, modalView.get('summary').value.length);

        async function saveForm() {
            close();
            if (configToRemove.id) {
                await thread.execute('booking/delete', {
                    eventId: configToRemove.id,
                    calendarId: system.publicDb.workers.find(i => i.column === configToRemove.worker).googleId
                });
            }
            const evt = createEvent(Object.assign({}, e, {
                summary: this.summary.value,
                duration: this.duration.value,
                date: this.date.valueAsNumber - (getSpainOffset(this.date.valueAsNumber) * 60 * 60 * 1000)
            }));
            await thread.execute('booking/add', {
                duration: evt.duration * 60 * 1000,
                calendarId: dbWorker.googleId,
                date: new Date(evt.date).toISOString(),
                summary: evt.summary,
                processId: evt.processId,
                description: evt.description,
                label: evt.label,
                treatments: evt.treatments || []
            });
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

    form.editHours = function ({ worker }) {
        const workerItem = system.publicDb.workers.find(c => c.column === worker);
        const calendar = getCalendar(system.publicDb, reverseLocalTime(system.store.date, system));
        const { modalView } = createModal(editHours, {
            workers: system.publicDb.workers,
            days: dayNames
                .map((title, index) => ({ title, index }))
                .filter(item => item.index !== 0),
            centers: system.publicDb.centers
                .filter(item => item.closed !== true)
        }, async function (close) {
            modalView.clear();
            close();
        });
        modalView.get('days').style.display = 'none';
        modalView.get('workers').querySelector(`#edit-hours-worker-${workerItem.index}`).checked = true;
        modalView.get('form').changeDate = function (index) {
            if (index === 0) modalView.get('days').style.display = 'none';
            if (index === 1) modalView.get('days').style.display = 'block';
        };
    };

    view.destroy = function () {
        window.removeEventListener('resize', onResize);
    };

    view.update = () => {
        onResize();
    }

    window.rx.connect({ date: () => system.store.date }, function ({ date }) {
        changeMiniCalendarDate(new Date(date));
        if (system.store.logged) drawCalendars('');
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

    system.publicDb.workers.forEach(async function (c) {
        view.clear(`${c.column}_header`).appendTo(`${c.column}_header`, dayTpl, [], c);
    })

    function drawCalendars(search, callServer = true) {
        const calendar = getCalendar(system.publicDb, system.store.date);
        system.publicDb.workers.forEach(async function (c) {
            const dayView = view.clear(c.column).appendTo(c.column, '<div #wrapper></div>', [], c);
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
                const treatments = extendedProperties && extendedProperties.private && extendedProperties.private.treatments;
                const startTime = new Date(start.dateTime).getTime();
                const endTime = new Date(end.dateTime).getTime();
                const duration = Math.ceil((endTime - startTime) / (60 * 1000));
                const e = createEvent({
                    id,
                    worker: c.column,
                    processId,
                    summary: (summary || '').replace(/'/g, ' '),
                    description,
                    attendees,
                    date: startTime,
                    duration,
                    label,
                    treatments
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

        let date = new Date(dt);
        date.setDate(1);
        const today = new Date();
        miniView.get('month').innerText = date.formatDay('mmm yy', [], monthNames);
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
                    date.setDate(day);

                    if (today.getTime() > date.getTime()) node.classList.add('old');
                    if (isWorkDay(date)) {
                        node.classList.add('work');
                    }
                    node.innerText = (date.getDate());
                    node.setAttribute('data-day', date.getDate());
                    date.setDate(++day);
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

function dropToCart(thread, config, client, locale, system, treatment) {
    thread.execute(({ gos }) => {
        if (config.treatments && config.treatments.length) {
            addCart(client, gos, locale);
            const trts = (typeof config.treatments === 'string') ? JSON.parse(config.treatments) : config.treatments;
            trts.forEach(id => gos.cart.addToCart(id));
            system.navigateTo(`${locale.get('urls.cart.href')}`);
            gos.cart.cartToCash();
        } else if (treatment) {
            addCart(client, gos, locale);
            gos.cart.addToCart(treatment.identificador);
            system.navigateTo(`${locale.get('urls.cart.href')}`);
            gos.cart.cartToCash();
        } else {
            const des = config.label || config.summary;
            system.navigateTo(`${locale.get('urls.cash.href')}`);
            gos.cash.addCash(des, client ? client._id : null, `${locale.get('urls.events.href')}`);
        }
    });
}

function addCart(client, gos, locale) {
    if (client) {
        gos.cart.addCart(client._id, `${locale.get('urls.events.href')}`);
    } else {
        gos.cart.addCart('', `${locale.get('urls.events.href')}`);
    }
}

