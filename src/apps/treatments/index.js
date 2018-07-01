import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import treatmentTemplate from './treatment.html';
import * as styles from './index.scss';
import Menu from './Menu';

function treatments({ system }) {
    return async function ({ parent, thread }) {
        let obj = {};
        const locale = await system.locale(`/localization/treatments/es.json`);
        await locale.load(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const menu = await Menu(view.get('menu'), { system });

        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ treatments: system.store.treatments.map(i => i.identificador) });
            system.store.notifications = Math.random();
            disconnect()
        };

        async function changeFavourite(id, value) {
            system.store.treatments.filter(i => i.identificador == id)[0].favourite = value;
            const old = system.store.treatments.splice(0, system.store.treatments.length);
            system.store.treatments.push(...old);
            await thread.execute('user/treatmentFavourite', { id, value });
        }

        view.get('treatments').change = changeFavourite;

        view.get('treatments').add = function (id) {
            system.store.cart.push(id);
        };

        view.get('treatments').book = async function (id) {
            await changeFavourite(id, true);
            system.book.treatments.splice(0, system.book.treatments.length);
            system.book.treatments.push(id);
            system.navigateTo(locale.get('urls.bookings'));
        };

        obj.navigateTo = async function (e) {
            switch (e) {
            case undefined:
                await menu.open();
                view.get('treatments').innerHTML = '';
                break;
            default:
                await menu.close(e);
                addTreatments(menu.path(e));
                return;
            }
        };

        function addTreatments(type) {
            system.store.treatments
                .filter(item => item.tipo === type)
                .forEach(item => {
                    const isBookable = Object.keys(system.store.centers)
                        .map(key => system.store.centers[key].workers)
                        .reduce((arr, wks) => arr.concat(wks), [])
                        .filter((item, pos, self) => self.indexOf(item) === pos)
                        .filter(k => Number(item[k]) !== 0).length > 0;
                    const newItem = system.getStorage('treatments').indexOf(item.identificador) === -1
                        ? locale.get('newItemTemplate') : '';
                    const bookDisplay = item.online === 'si' ? 'block' : 'none';
                    const callDisplay = item.online !== 'si' ? 'block' : 'none';
                    const favouriteDisplay = (system.store.logged && isBookable) ? 'block' : 'none';
                    const checked = item.favourite ? 'checked' : '';
                    const variables = { newItem, bookDisplay, callDisplay, favouriteDisplay, checked, item };
                    view.appendTo('treatments', treatmentTemplate, [], Object.assign({}, variables, locale.get()));
                });
        }

        return obj;
    }
}

plugin(treatments);