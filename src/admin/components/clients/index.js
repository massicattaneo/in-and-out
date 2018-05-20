import { HtmlView } from "gml-html";
import template from './template.html';
import list from './clients-list.html';
import * as style from './style.scss';
import * as listStyle from './list.scss';
import editClient from './edit-client.html';
import { createModal } from "../../utils";

function filterClients(find) {
    return function(item) {
        if (item.deleted === true) return false;
        if (find === '') return true;
        return `${item.surname} ${item.name}`.toLowerCase().indexOf(find) !== -1;
    }
}

export default async function({ locale, system, thread }) {
    const params = Object.assign({}, locale.get());
    const view = HtmlView(template, style, params);

    ({width: () => system.deviceInfo().width})
        .reactive()
        .connect(function({ width }) {
            view.style('', {footer: {left: width > 1024 ? 240 : 0 }});
        });

    ({ search: () => system.store.search, clients: () => system.store.clients })
        .reactive()
        .connect(function({ search, clients }) {
            const filter = clients
                .filter(filterClients(search))
                .sort((a, b) => a.surname.localeCompare(b.surname))
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

    view.get('wrapper').delete = async function(id) {
        if (confirm('seguro?')) {
            await thread.execute('rest-api', {
                api: `users/${id}`,
                method: 'delete'
            });
        }
    };

    view.get('wrapper').update = async function(id) {
        const p = system.store.clients.find(i => i._id === id);
        const { modalView, modal } = createModal(editClient, Object.assign({}, p, { disabled: p.hash ? 'disabled' : '' }),
            async function(close) {
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
                close()
            })
    };

    view.get('wrapper').add = function() {
        const { modalView, modal } = createModal(editClient, {}, async function(close) {
            if (!this.name.value) system.throw('custom', { message: 'FALTA EL NOMBRE' });
            if (!this.surname.value) system.throw('custom', { message: 'FALTA EL APPELIDO' });
            await thread.execute('rest-api', {
                api: 'users',
                method: 'post',
                name: this.name.value,
                surname: this.surname.value,
                email: this.email.value,
                user: system.store.users[0],
                tel: this.tel.value
            });
            close()
        });
        modalView.get('name').focus();
        modalView.get('name').setSelectionRange(0, modalView.get('name').value.length);
    };

    view.destroy = function() {

    };


    return view;
}