import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './logged.html';
import * as styles from './logged.scss';
import deleteDone from './delete-done.html';
import appointmentTemplate from './appointment.html';

export default async function ({ system, parent, thread }) {
    const obj = {};
    const locale = await system.locale(`/localization/static.json`);
    await locale.load(`/localization/common/es.json`);
    await locale.load(`/localization/globalize/es.json`);
    await locale.load(`/localization/login/es.json`);
    const dayNames = new Array(7).fill(0).map((v, i) => locale.get(`day_${i}`));
    const view = HtmlView(template, styles, locale.get());
    const form = view.get('wrapper');

    const disconnect = ({
        orientation: () => system.deviceInfo().orientation,
        bookings: () => system.store.bookings
    })
        .reactive()
        .connect(function ({ orientation, bookings }) {
            view.style(orientation);
            view.get('appointments').innerHTML = locale.get('logged.emptyAppointments');
            if (bookings.length) {
                view.clear('appointments');
                bookings
                    .sort((a, b) => a.start - b.start)
                    .forEach(item => {
                        const date = new Date(item.start).formatDay('dddd, dd-mm-yyyy', dayNames);
                        const startTime = new Date(item.start).formatTime('hh:mm');
                        const endTime = new Date(item.end).formatTime('hh:mm');
                        const variables = Object.assign({} ,{ item, startTime, endTime, date }, locale.get());
                        view.appendTo('appointments', appointmentTemplate, [], variables);
                    });
            }
        });

    parent.appendChild(view.get());

    form.deleteBooking = async function (eventId, calendarId) {
        system.store.loading = true;
        await thread.execute('booking/delete', { eventId, calendarId });
        system.store.loading = false;
        const item = system.store.bookings.filter(b => b.eventId === eventId && b.calendarId === calendarId)[0];
        const index = system.store.bookings.indexOf(item);
        system.store.bookings.splice(index, 1);
    };

    form.logout = async function () {
        await thread.execute('user/logout');
        system.store.logged = false;
        system.navigateTo(locale.get('urls.home'));
    };

    form.deleteAccount = async function () {
        await thread.execute('user/delete', { password: view.get('password').value });
        system.store.logged = false;
        view.clear().appendTo('', deleteDone, [], locale.get());
    };

    obj.destroy = function () {
        disconnect();
    };


    return obj;
}
