import {HtmlView} from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

const filesTpl = `
{{#each files}}
    <fieldset
        onclick="this.form.removeFile('{{this._id}}')"
        class="mdl-chip mdl-chip--deletable">
        <span class="mdl-chip__text">{{this.name}}</span>
        <button type="button" class="mdl-chip__action"><i class="material-icons">cancel</i></button>
        </fieldset>
{{/each}}`;

const companyTpl = `
<div>
    {{#each company}}
    <fieldset class="list-item"
      onclick="this.form.fill('{{this.emitter.company}}', '{{this.emitter.cif}}', '{{this.emitter.address}}')">
      {{this.emitter.company}}
    </fieldset>
    {{/each}}
</div>`;

export default async function ({locale, system, thread}) {
    const view = HtmlView('<div></div>');

    rx.connect({bills: () => system.store.bills}, function () {
        const companies = system.store.bills.filter((o, i, a) => a.indexOf(a.find(e => e.emitter.company === o.emitter.company)) === i);
        const bills = system.store.bills.sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
        const files = [];
        const subView = view.clear().appendTo('', template, style, Object.assign({companies, bills}, locale.get()));
        subView.style();

        const form = subView.get();

        function resetForm() {
            files.length = 0;
            form.bill_amount.value = '';
            form.bill_number.value = '';
            form.bill_iva.value = '21';
            form.bill_company.value = '';
            form.bill_cif.value = '';
            form.bill_address.value = '';
            form.bill_upload.setAttribute('disabled', 'disabled');
        }

        resetForm();

        form.uploadFile = async function () {
            system.store.loading = true;
            subView.get('save').setAttribute('disabled', 'disabled');
            const file = form.fileUpload.files[0];
            const ext = file.name.substr(file.name.lastIndexOf('.'));
            const date = new Date(form.bill_date.valueAsNumber);
            const newFileName = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}-${form.bill_company.value}${ext}`;
            const formData = new FormData();
            formData.append('fileUpload', file, newFileName);

            const fileRes = await RetryRequest('/api/upload', {timeout: 60000}).post(formData)
                .catch(function (e) {
                    system.throw('generic-error');
                    system.store.loading = false;
                });

            setTimeout(function () {
                files.push(JSON.parse(fileRes.responseText));
                subView.clear('files').appendTo('files', filesTpl, [], {files});
                subView.get('save').removeAttribute('disabled');
                system.store.loading = false;
            }, 100);
        };

        form.removeFile = async function (id) {
            const file = files.find(f => f._id === id);
            if (file) {
                system.store.loading = true;
                await RetryRequest('/api/upload/' + id, {}).send('DELETE');
                setTimeout(function () {
                    files.splice(files.indexOf(file), 1);
                    subView.clear('files');
                    files.length && subView.appendTo('files', filesTpl, [], {files});
                    system.store.loading = false;
                }, 100);
            }
        };

        form.change = function () {
            if (!form.bill_company.value || !form.bill_date.valueAsNumber) {
                form.bill_upload.setAttribute('disabled', 'disabled');
            } else {
                form.bill_upload.removeAttribute('disabled');
            }
        };

        form.clearAutofill = function() {
            setTimeout(() => subView.clear('autofill'), 100);
        };

        form.autofill = function () {
            const v = subView.get('company').value.toLowerCase();
            if (!v) return subView.clear('autofill');
            const company = bills
                .filter(c => c.emitter.company.toLowerCase().indexOf(v) !== -1)
                .filter((a,b,c) => c.indexOf(c.find(i => i.emitter.company === a.emitter.company)) === b);
            subView.clear('autofill').appendTo('autofill', companyTpl, [], {company})
        };

        form.fill = function (a, b, c) {
            form.bill_company.value = a;
            form.bill_cif.value = b;
            form.bill_address.value = c;
            componentHandler.upgradeDom();
        };

        form.save = async function () {
            if (!form.bill_amount.value && isNaN(form.bill_amount.value)) return system.throw('custom', {message: 'FALTA EL TOTAL DE LA FACTURA'});
            if (!form.bill_type.value) return system.throw('custom', {message: 'COMO HAZ PAGADO?'});
            system.store.loading = true;
            const res = await thread.execute('rest-api', {
                api: 'bills',
                method: 'post',
                date: new Date(form.bill_date.valueAsNumber).toISOString(),
                amount: Number(form.bill_amount.value),
                number: form.bill_number.value,
                iva: Number(form.bill_iva.value),
                type: form.bill_type.value,
                emitter: {
                    company: form.bill_company.value.toUpperCase(),
                    cif: form.bill_cif.value,
                    address: form.bill_address.value.toUpperCase()
                },
                files
            });
            system.store.loading = false;
        };
    });

    view.destroy = function () {

    };

    return view;
}
