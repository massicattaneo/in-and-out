import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import {RetryRequest} from "gml-http-request";

function products({ system }) {
    return async function ({ parent, db }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/common/es.json`);
        await locale.load(`/localization/team/es.json`);
        const view = HtmlView(template, styles, locale.get());

        system.store.bonusCards.forEach(item => {
            const treatments = item.tratamientos.length ?
                item.tratamientos.split('|')
                .map(i => i.trim())
                .map(i=> {
                    const arr = i.match(/(\d*)xID-(\d*)/);
                    return {
                        id: Number(arr[2]),
                        count: Number(arr[1])
                    }
                }) : [];

            view.get('products').appendChild(Node(`
                <div class="box">
                    <h3 class="green-color">${item.titulo}</h3>
                    <p>${item.descripcion}</p>
                    ${treatments.length ? '<ul>' : ''}
                    ${treatments.map(t => `<li>${t.count} tratamientos de:<br/> 
                            ${system.store.treatments.filter(i => i.identificador == t.id)[0].titulo.toUpperCase()}</li>`).join('')}
                    ${treatments.length ? '</ul>' : ''}
                    <hr/>
                    <input type="button" class="green-bg-color white-color button clickable fa fa-cart-plus" onclick="this.form.add('${item.identificador}')" value="${item.precio_texto}" />
                </div>
            `));
        });

        view.get('products').add = function (id) {
            system.store.cart.push(id);
        };

        const disconnectResize = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        const disconnectCart = ({ cart: () => system.store.cart })
            .reactive()
            .connect(function ({ cart }) {
                view.get('cart').innerHTML = `TIENES ${cart.length} PRODUCTOS`
            });

        obj.destroy = function () {
            disconnectResize();
            disconnectCart();
        };

        parent.appendChild(view.get());

        return obj;
    }
}

plugin(products);