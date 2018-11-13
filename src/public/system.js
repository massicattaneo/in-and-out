import { System } from 'gml-system';
import 'gml-polyfills';
import { version } from '../../package.json';
import { HtmlView } from '../../modules/gml-html';
import cookiesTpl from './cookies.html';

const appName = 'in-and-out';
const system = System({
    ua: window.navigator.userAgent,
    config: { appName, version }
});

const statements = {};
const folders = require.context('./statements/', true, /.*/);
folders.keys().forEach((filename) => {
    if (filename.indexOf('.js') !== -1) {
        statements[filename.replace('./', '').replace('.js', '')] = folders(filename).default;
    }
});
if (!window.jsEnabled) {
    (async function () {
        const thread = system.createThread(() => {
            return { statements };
        });
        thread.execute('set-up-environment');
        await thread.execute('create-store');
        thread.execute('set-up-navigation');
        await thread.execute('load-resources');
        const welcomeEl = document.getElementById('welcome');

        function click() {
            const view = HtmlView(cookiesTpl, [], {});
            view.get().cookieAccept = function () {
                system.setStorage({ 'in-and-out-accepted-cookies': true });
                welcomeEl.style.display = 'none';
            };
            welcomeEl.removeEventListener('click', click);
            welcomeEl.removeEventListener('touchstart', click);
            welcomeEl.appendChild(view.get());
            welcomeEl.style.opacity = 1;
        }

        if (!system.getStorage('in-and-out-accepted-cookies')) {
            welcomeEl.innerHTML = '';
            welcomeEl.addEventListener('click', click);
            welcomeEl.addEventListener('touchstart', click);
        } else {
            welcomeEl.style.display = 'none';
        }
        thread.execute('create-home-page');
        thread.execute(function () {
            return system.navigateTo(this.redirectUrl, {}, false, true);
        });
    })();
}

