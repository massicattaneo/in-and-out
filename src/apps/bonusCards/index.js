import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import cardTemplate from './card.html';
import treatmentTemplate from './treatment.html';
import * as styles from './index.scss';
import { getCartTotal, getPromotionDiscounts, isInPromotion, sortByDate } from '../../../web-app-deploy/shared';

function bonusCards({ system }) {
    return async function ({ parent, db }) {
        const obj = {};
        const view = HtmlView(template, styles, {});
        const locale = await system.locale(`/localization/bonusCards/es.json`);
        await locale.load(`/localization/common/es.json`);
        view.get('search').style.width = 'calc(100% - 20px)';

        const store = window.rx.create({
            type: ''
        });

        const bonuses = [];
        const storageBonusesIds = system.getStorage('bonusCards');

        const types = system.store.treatments
            .filter(trt => {
                return system.store.bonusCards.find(bonus => {
                    const [item = 'x'] = (bonus.tratamientos || '').split('|');
                    const [, id] = item.split('x');
                    return trt.identificador === id;
                });
            })
            .map(item => item.tipo)
            .filter((o, i, a) => a.indexOf(o) === i)
            .concat('Tarjeta Regalo')
            .sort();
        types.forEach(type => view.get('type').appendChild(Node(`<option value="${type}">${type.toUpperCase()}</option>`)));

        view.get('search').change = what => {
            store[what] = view.get('search')[what].value;
        };

        const only = location.pathname.split('/')[3];

        const addBonus = item => {
            const { treatments } = item;
            const newItem = system.getStorage('bonusCards').indexOf(item.identificador) === -1
                ? locale.get('newItemTemplate') : '';
            const allPromos = system.store.promotions.map(getPromotionDiscounts)
                .reduce((a, i) => a.concat(i), [])
            let ps = allPromos
                .filter(i => i.items.filter(o => o.id === item.identificador).length === i.items.length).length;
            ps = ps || (allPromos.find(i => i.items.find(sub => sub.id === "TAR-*")) && item.credito === "0")
            const card = view.appendTo('bonus', cardTemplate, null, Object.assign({
                card: Object.assign({}, item, {
                    price: system.toCurrency(item.precio),
                    discounted: system.toCurrency(getCartTotal(system.store, [item.identificador]).total),
                    showDiscount: ps ? '' : 'none',
                    bgColor: !ps ? '' : '#ffe1e1',
                    textDecoration: !ps ? '' : 'line-through'
                }),
                newItem
            }, locale.get()));
            treatments.forEach(function (t) {
                const title = t.titulo.toUpperCase();
                const variables = Object.assign({}, {
                    count: t.count,
                    title,
                    href: `${t.menuhref}/${t.href}`
                }, locale.get());
                card.appendTo('treatments', treatmentTemplate, [], variables);
            });
        };

        view.get('bonus').add = function (id) {
            system.store.cart.push(id);
        };

        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        const disconnect1 = window.rx.connect({
            type: () => store.type
        }, function ({ type }) {
            bonuses.length = 0;
            bonuses.push(...system.store.bonusCards.slice(0)
                .map(card => {
                    const treatments = card.tratamientos.length ?
                        card.tratamientos.split('|')
                            .map(i => i.trim())
                            .map(i => {
                                const arr = i.match(/(\d*)x(.*)/);
                                return Object.assign({
                                    count: Number(arr[1])
                                }, system.store.treatments.find(i => i.identificador === arr[2]));
                            }) : [];
                    return Object.assign({
                        tipo: treatments[0] ? treatments[0].tipo : 'Tarjeta Regalo',
                        treatments
                    }, card);
                })
                .filter(item => !type || item.tipo === type)
                .sort((first, second) => {
                    if (isInPromotion(system.store.promotions, first)) return -1;
                    if (!storageBonusesIds.includes(first.identificador)) return -1;
                    if ((first.posicion - second.posicion) === 0) {
                        if (first.disponible === 'no' && second.disponible === 'si') return 1;
                        if (first.disponible === 'si' && second.disponible === 'no') return -1;
                        return 0;
                    }
                    return first.posicion - second.posicion;
                }));
            view.clear('bonus');
            if (obj.loadContent) {
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
                obj.loadContent();
            }
        });

        obj.navigateTo = (type, trt) => {
            if (!type || !trt) return;
            view.clear('bonus');
            bonuses.length = 0;
            const item = system.store.bonusCards.find(item => item.href === trt);
            bonuses.push(item);
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
            obj.loadContent();
        };

        obj.loadContent = async function () {
            if (bonuses.length) {
                const item = bonuses.splice(0, 1)[0];
                addBonus(item);
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        obj.destroy = function () {
            system.setStorage({ bonusCards: system.store.bonusCards.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect();
            disconnect1();
        };

        parent.appendChild(view.get());

        return obj;
    };
}

plugin(bonusCards);
