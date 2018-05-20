import {System} from 'gml-system';
import 'gml-polyfills';
import {version} from '../../package.json';

const appName = 'in-and-out';
const system = System({
    ua: window.navigator.userAgent,
    config: { appName, version }
});

window.system = system;

const statements = {};
const folders = require.context("./statements/", true, /.*/);
folders.keys().forEach((filename) => {
    if (filename.indexOf('.js') !== -1) {
        statements[filename.replace('./', '').replace('.js', '')] = folders(filename).default;
    }
});

window.cookieAccept = function() {
    system.setStorage({"in-and-out-accepted-cookies": true});
    document.getElementById('welcome').style.display = 'none';
};

(async function () {
    const thread = system.createThread(() => {
        return { statements }
    });
    thread.execute('set-up-environment');
    await thread.execute('create-store');
    thread.execute('set-up-navigation');
    await thread.execute('load-resources');
    document.getElementById('welcome').style.display = system.getStorage('in-and-out-accepted-cookies') ? 'none' : 'block';
    thread.execute('create-home-page');
    thread.execute(function () {
        return system.navigateTo(this.redirectUrl);
    });
})();
