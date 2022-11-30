import { plugin } from 'gml-system';
import { HtmlView, Node } from 'gml-html';
import template from './index.html';
import treatmentTemplate from './treatment.html';
import * as styles from './index.scss';
import { getCartTotal, isInPromotion } from '../../../web-app-deploy/shared';

function treatments({ system }) {
    return async function ({ parent, thread }) {
        let obj = {};
        const locale = await system.locale(`/localization/treatments/es.json`);
        await locale.load(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        view.get('search').style.width = 'calc(100% - 20px)';

        const store = window.rx.create({
            type: ''
        });

        const treatments = [];
        const storageTreatmentsIds = system.getStorage('treatments');

        const types = system.store.treatments
            .map(item => item.tipo)
            .filter((o, i, a) => a.indexOf(o) === i)
            .sort();
        types.forEach(type => view.get('type').appendChild(Node(`<option value="${type}">${type.toUpperCase()}</option>`)));

        view.get('search').change = what => {
            store[what] = view.get('search')[what].value;
        };

        const disconnect = window.rx.connect({
            orientation: () => system.deviceInfo().orientation
        }, function ({ orientation }) {
            view.style(orientation);
        });

        const disconnect1 = window.rx.connect({
            type: () => store.type
        }, function ({ type }) {
            treatments.length = 0;
            treatments.push(...system.store.treatments.slice(0)
                .filter(item => !type || item.tipo === type)
                .sort((first, second) => {
                    if (isInPromotion(system.store.promotions, first)) return -1;
                    if (!storageTreatmentsIds.includes(first.identificador)) return -1;
                    if ((first.posicion - second.posicion) === 0) {
                        if (first.disponible === 'no' && second.disponible === 'si') return 1;
                        if (first.disponible === 'si' && second.disponible === 'no') return -1;
                        return 0;
                    }
                    return first.posicion - second.posicion;
                }));
            view.clear('treatments');
            if (obj.loadContent) {
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
            }
        });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ treatments: system.store.treatments.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
            disconnect1();
        };

        async function changeFavourite(id, value) {
            system.store.treatments.filter(i => i.identificador === id)[0].favourite = value;
            const old = system.store.treatments.splice(0, system.store.treatments.length);
            system.store.treatments.push(...old);
            await thread.execute('user/treatmentFavourite', { id, value });
        }

        view.get('treatments').change = changeFavourite;

        view.get('treatments').add = function (id) {
            system.store.cart.push(id);
        };

        view.get('treatments').book = async function (id) {
            if (system.store.logged) {
                await changeFavourite(id, true);
                system.book.treatments.splice(0, system.book.treatments.length);
                system.book.treatments.push(id);
            }
            system.navigateTo(locale.get('urls.bookings'));
        };

        obj.navigateTo = (type, trt) => {
            if (!type || !trt) return;
            view.clear('treatments');
            treatments.length = 0;
            const item = system.store.treatments.find(item => item.href === trt);
            treatments.push(item);
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
        };

        obj.loadContent = async function () {
            if (treatments.length) {
                const item = treatments.splice(0, 1)[0];
                addTreatments(item);
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        function addTreatments(item) {
            const isBookable = item.precio !== "" && system.store.workers.filter(worker => item[worker.column] !== 0).length;
            const newItem = system.getStorage('treatments').indexOf(item.identificador) === -1
                ? locale.get('newItemTemplate') : '';
            const bookDisplay = isBookable ? 'block' : 'none';
            const callDisplay = isBookable ? 'block' : 'none';
            const addToCartDisplay = item.precio !== "" ? 'block' : 'none';
            const favouriteDisplay = (system.store.logged && isBookable) ? 'block' : 'none';
            const checked = item.favourite ? 'checked' : '';
            const variables = {
                newItem,
                bookDisplay,
                addToCartDisplay,
                callDisplay,
                favouriteDisplay,
                checked,
                item
            };
            const ps = isInPromotion(system.store.promotions, item);
            const itemOverride = {
                item: Object.assign({}, item, {
                    price: item.precio ? system.toCurrency(item.precio) : `Precio ${item.precio_texto}`,
                    discounted: system.toCurrency(getCartTotal(system.store, [item.identificador]).total),
                    showDiscount: ps ? '' : 'none',
                    bgColor: !ps ? '' : '#fae1ce',
                    textDecoration: !ps ? '' : 'line-through'
                })
            };
            view.appendTo('treatments', treatmentTemplate, [], Object.assign({}, variables, itemOverride, locale.get()));
        }

        return obj;
    };
}

plugin(treatments);
