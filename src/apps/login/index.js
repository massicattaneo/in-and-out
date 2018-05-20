import {plugin} from 'gml-system';
import {Node, HtmlStyle, HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import Register from './register/Register';
import Login from './login/Login';
import Recover from './recover/Recover';
import Reset from './reset/Reset';
import Confirm from './confirm/Confirm';
import Home from './home/Home';
import Logged from './logged/Logged';

function login({ system }) {
    return async function ({ parent, thread }) {
        let obj = {};
        let subPage = {destroy: () => {}};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/login/es.json`);

        const view = HtmlView(template, styles, locale.get());
        if (system.store.logged) {
            subPage.destroy();
            subPage = await Logged({ system, parent: view.get(), thread });
        } else {
            subPage.destroy();
            subPage = await Home({ system, parent: view.get(), thread });
        }

        const disconnect = ({ orientation: () => system.deviceInfo().orientation })
            .reactive()
            .connect(function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        obj.navigateTo = async function (e) {
            view.get().innerHTML = '';
            subPage.destroy();
            if (e !== 'confirmacion' && system.store.logged) {
                subPage = await Logged({ system, parent: view.get(), thread })
                return subPage;
            }
            switch (e) {
                case 'crear':
                    subPage = await Register({ system, parent: view.get(), thread })
                    return subPage;
                case 'entrar':
                    subPage = await Login({ system, parent: view.get(), thread })
                    return subPage;
                case 'recuperar':
                    subPage = await Recover({ system, parent: view.get(), thread })
                    return subPage;
                case 'reiniciar':
                    subPage = await Reset({ system, parent: view.get(), thread })
                    return subPage;
                case 'confirmacion':
                    subPage = await Confirm({ system, parent: view.get(), thread })
                    return subPage;
                default:
                    subPage = await Home({ system, parent: view.get(), thread })
                    return subPage;
            }

        };

        obj.destroy = function () {
            disconnect();
            subPage.destroy();
        };

        return obj;
    }
}

plugin(login);