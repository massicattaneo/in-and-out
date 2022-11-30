import { HtmlView } from 'gml-html';
import template from './template.html';
import clientList from './clients-list.html';
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
    const model = window.rx.create({ search: '' });

    window.rx.connect({ width: () => system.deviceInfo().width }, function ({ width }) {
        view.style('', { footer: { left: width > 1024 ? 240 : 0 } });
    });

    window.rx.connect({
        search: () => model.search,
        clients: () => system.store.clients
    }, function ({ search, clients }) {
        const filter = clients
            .filter(filterClients(search))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => Object.assign(c, {
                formattedTel: formatPhoneNumber(c),
                deleteDisabled: c.hash ? 'disabled' : '',
                emailBgColor: 'none',
                online: `<output ondragstart="this.form.dragStart('${c._id}')" draggable="true" class="circle-indicator ${c.hash && 'mdl-color--primary'}"></output>`
            }));
        const p = Object.assign({ clients: filter.filter((a, i) => i < 100) }, locale.get());
        const v = view.clear('clients').appendTo('clients', clientList, listStyle, p);
        view.get('count').innerText = `CLIENTES: ${filter.length}`;
        view.get('useweb').innerText = `ON-LINE: ${filter.filter(i => i.hash).length}`;
        view.get('withorders').innerText = `PEDIDOS ONLINE: ${filter.filter(i => system.store.orders.find(o => o.email === i.email)).length}`;
        view.get('withcard').innerText = '';
        v.style();
    });
    const form = view.get('wrapper');

    form.search = (event, el) => {
        model.search = el.value;
    }
    form.dragStart = function (params) {
        window.event.dataTransfer.setData('config', JSON.stringify(params));
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
    form.drop = async function () {
        const oldClient = window.event.target.getAttribute('data-id');
        const newClient = JSON.parse(window.event.dataTransfer.getData('config'));
        if (oldClient && confirm('ESTAS SEGURO? LOS CLIENTES SERAN JUNTADOS!')) {
            const bonuses = await thread.execute('rest-api', {
                method: 'get',
                api: `bonus?clientId=${oldClient}`
            });
            const transactions = await thread.execute('rest-api', {
                method: 'get',
                api: `cash?clientId=${oldClient}`
            });
            for (let b = 0; b < bonuses.length; b++) {
                await thread.execute('rest-api', {
                    api: `bonus/${bonuses[b]._id}`,
                    method: 'put',
                    clientId: newClient
                });
            }
            for (let t = 0; t < transactions.length; t++) {
                await thread.execute('rest-api', {
                    api: `cash/${transactions[t]._id}`,
                    method: 'put',
                    clientId: newClient
                });
            }
            await thread.execute('rest-api', {
                api: `users/${oldClient}`,
                method: 'delete'
            });
        }
    };

    form.delete = async function (id) {
        if (confirm('seguro?')) {
            await thread.execute('rest-api', {
                api: `users/${id}`,
                method: 'delete'
            });
        }
    };

    form.sendEmail = async function (email) {
        if (confirm('Quieres enaviar un correo para restablecer/crear la contraseña?')) {
            thread.execute('user/recover', { email: email });
        }
    };

    form.goToCart = id => {
        thread.execute(({ gos }) => {
            gos.cart.addCart(id, `${locale.get('urls.clients.href')}`);
        })
        system.navigateTo(`${locale.get('urls.cart.href')}`);
    }

    form.update = async function (id) {
        const p = system.store.clients.find(i => i._id === id);
        const { modalView, modal } = createModal(editClient, Object.assign({}, p),
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

    form.add = function () {
        const { modalView, modal } = createModal(editClient, {}, async function (close) {
            if (!this.name.value) system.throw('custom', { message: 'FALTA EL NOMBRE' });
            if (!this.surname.value) system.throw('custom', { message: 'FALTA EL APPELIDO' });
            const email = this.email.value.toLowerCase();
            const existing = await thread.execute('rest-api', { method: 'get', api: `users?email=${email}` });
            if (email && existing.length > 0) system.throw('custom', { message: 'CORREO YA EXISTE' });
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
            if (email && confirm('Quieres enaviar un correo para aceptar la Privacy?')) {
                await thread.execute('user/privacyEmail', { email });
            }
            close();
        });
        modalView.get('name').focus();
        modalView.get('name').setSelectionRange(0, modalView.get('name').value.length);
    };

    form.resetCard = function () {
        system.nfc.send('empty');
    };

    form.scanqr = function () {
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

    view.update = function () {
        view.get('search').focus()
        view.get('search').setSelectionRange(0, view.get('search').value.length)
    }

    view.destroy = function () {

    };


    return view;
}
function formatPhoneNumber(c) {
    const phone = c.tel || '';
    if (phone.length === 9)
        return `${phone.substr(0, 3)} ${c.tel.substr(3, 3)} ${c.tel.substr(6)}`;
    if (phone.length === 12)
        return `${phone.substr(0, 3)} ${c.tel.substr(3, 3)} ${c.tel.substr(6, 2)} ${c.tel.substr(8,2)} ${c.tel.substr(10,2)}`;
    return phone;
}

