import { HtmlView } from 'gml-html';
import template from './template.html';
import list from './clients-list.html';
import * as style from './style.scss';
import * as listStyle from './list.scss';
import editClient from './edit-client.html';
import { createModal } from '../../utils';

function isInside(string = '', find) {
    return string.toLowerCase().indexOf(find.toLowerCase()) !== -1;
}

function filterClients(find) {
    return function (item) {
        if (item.deleted === true) return false;
        if (find === '') return true;
        if (item.email.indexOf(find) !== -1) return true;
        const words = find.split(' ');
        return words.filter(function (word) {
            return isInside(item.name, word) || isInside(item.surname, word);
        }).length === words.length;
    };
}

export default async function ({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);

    window.rx.connect({ width: () => system.deviceInfo().width }, function ({ width }) {
        view.style('', { footer: { left: width > 1024 ? 240 : 0 } });
    });

    window.rx.connect({
        search: () => system.store.search,
        clients: () => system.store.clients
    }, function ({ search, clients }) {
        const filter = clients
            .filter(filterClients(search))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => Object.assign(c, {
                deleteDisabled: c.hash ? 'disabled' : '',
                online: `<span class="circle-indicator ${c.hash && 'mdl-color--primary'}"></span>`
            }));
        const p = Object.assign({ clients: filter.filter((a, i) => i < 100) }, locale.get());
        const v = view.clear('clients').appendTo('clients', list, listStyle, p);
        view.get('count').innerText = `CLIENTES: ${filter.length}`;
        view.get('useweb').innerText = `ON-LINE: ${filter.filter(i => i.hash).length}`;
        view.get('withorders').innerText = `PEDIDOS ONLINE: ${filter.filter(i => system.store.orders.find(o => o.email === i.email)).length}`;
        view.get('withcard').innerText = '';
        v.style();
    });

    view.get('wrapper').delete = async function (id) {
        if (confirm('seguro?')) {
            await thread.execute('rest-api', {
                api: `users/${id}`,
                method: 'delete'
            });
        }
    };

    view.get('wrapper').sendEmail = async function (email) {
        if (confirm('Quieres enaviar un correo para restablecer/crear la contraseña?')) {
            thread.execute('user/recover', { email: email });
        }
    };

    view.get('wrapper').update = async function (id) {
        const p = system.store.clients.find(i => i._id === id);
        const { modalView, modal } = createModal(editClient, Object.assign({}, p, { disabled: p.hash ? 'disabled' : '' }),
            async function (close) {
                if (!this.name.value) system.throw('custom', { message: 'FALTA EL NOMBRE' });
                if (!this.surname.value) system.throw('custom', { message: 'FALTA EL APPELIDO' });
                await thread.execute('rest-api', {
                    api: `users/${id}`,
                    method: 'put',
                    name: this.name.value,
                    surname: this.surname.value,
                    email: this.email.value,
                    tel: this.tel.value
                });
                close();
            });
    };

    view.get('wrapper').add = function () {
        const { modalView, modal } = createModal(editClient, {}, async function (close) {
            if (!this.name.value) system.throw('custom', { message: 'FALTA EL NOMBRE' });
            if (!this.surname.value) system.throw('custom', { message: 'FALTA EL APPELIDO' });
            const email = this.email.value.toLowerCase();
            const existing = await thread.execute('rest-api', { method: 'get', api: `users?email=${email}` });
            if (existing.length > 0) system.throw('custom', { message: 'CORREO YA EXISTE' });
            await thread.execute('rest-api', {
                api: 'users',
                method: 'post',
                name: this.name.value,
                surname: this.surname.value,
                email,
                user: system.store.users[0],
                tel: this.tel.value,
                privacy: false
            });
            if (confirm('Quieres enaviar un correo para aceptar la Privacy?')) {
                await thread.execute('user/privacyEmail', { email });
            }
            close();
        });
        modalView.get('name').focus();
        modalView.get('name').setSelectionRange(0, modalView.get('name').value.length);
    };

    view.get('wrapper').resetCard = function () {
        system.nfc.send('empty');
    };

    view.get('wrapper').scanqr = function () {
        const scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
        scanner.addListener('scan', function (content) {
            scanner.stop();
            system.navigateTo(`${locale.get('urls.history.href')}?id=${content}`);
        });
        Instascan.Camera.getCameras().then(function (cameras) {
            if (cameras.length > 0) {
                scanner.start(cameras[0]);
            } else {
                console.error('No cameras found.');
            }
        }).catch(function (e) {
            console.error(e);
        });
    };

    view.destroy = function () {

    };


    return view;
}
