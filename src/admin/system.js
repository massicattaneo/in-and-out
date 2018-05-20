import { System } from 'gml-system';
import 'gml-polyfills';
import { version, description, name, author } from '../../package.json';

const system = System({
    ua: window.navigator.userAgent,
    config: { version, description, name, author }
});

const statements = {};
const pFolders = require.context("../public/statements/", true, /.js/);
pFolders.keys().forEach((filename) => {
    statements[filename.replace('./', '').replace('.js', '')] = pFolders(filename).default;
});

const folders = require.context("./statements/", true, /.js/);
folders.keys().forEach((filename) => {
    statements[filename.replace('./', '').replace('.js', '')] = folders(filename).default;
});


const gosFolders = require.context("./components/", true, /.index\.js/);
const Gos = gosFolders.keys().map((filename) => {
    const name = filename.substr(2, filename.lastIndexOf('/') - 2);
    return { name, init: gosFolders(filename).default };
});

(async function() {
    const thread = system.createThread(() => Object.create({ statements, gos: {} }));
    thread.execute('set-up-environment');
    await thread.execute('create-store');
    await thread.execute(async function({ wait }) {
        const gos = {};
        const locale = await system.locale('/localization/static.json');
        await locale.load('/localization/globalize/es.json');
        await locale.load('/localization/admin/es.json');

        this.locale = locale;
        for (let index = 0; index < Gos.length; index++) {
            gos[Gos[index].name] = await Gos[index].init({ locale, system, thread, wait });
        }
        thread.inject({ gos });
    });
    thread.execute('set-up-navigation');
    await thread.execute('load-resources');

    thread.execute(function({ gos }) {
        document.getElementById('header').appendChild(gos.header.get());
        document.getElementById('menu').appendChild(gos.menuHeader.get());
        document.getElementById('menu').appendChild(gos.menuItems.get());
    });
    thread.execute(function() {
        return system.navigateTo(this.redirectUrl);
    });
    thread.execute('setup-keyboard');
    await thread.execute('create-web-socket');
    document.getElementById('app').style.opacity = 1;
})();
