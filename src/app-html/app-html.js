import {Renderer} from 'gml-components'
import {Node} from 'gml-html'

document.addEventListener('html', async function (data) {
    const startThread = data.detail.start();

    const smsFolder = require.context("../statements/", true, /.*/);
    const sms = {};

    smsFolder.keys().forEach((filename) => {
        sms[filename.replace('./', '')] = smsFolder(filename).default;
    });

    const gosFolder = require.context("../gos/", true, /.*/);
    const _gos = {};
    gosFolder.keys().forEach((filename) => {
        if (filename.indexOf('.js') !== -1) {
            _gos[filename.substr(filename.lastIndexOf('/') + 1).replace('.js', '')] = gosFolder(filename).default;
        }
    });

    function initGos(gos, system, context, drawer) {
        return Object.keys(gos).reduce((a, key) => {
            a[key] = gos[key]({ system, context, drawer });
            return a;
        }, {});
    }

    startThread.execute(function ({ system }) {

        const thread = system.createThread(function () {
            const container = document.getElementById('app-2');

            this.renderer = Renderer({ container, mode: 'html' })
                .addDesignMode('landscape', {
                    designWidth: 1920,
                    designHeight: 1080,
                    condition: info => true
                });

            return {
                statements: sms,
                gos: initGos(_gos, system, this, system.plugin('htmlDrawer'))
            };
        });

        thread.execute(function ({ system, gos, }) {
            const context = this;
            context.renderer.push(gos);

            function resizeRenderer() {
                context.renderer.resize({
                    designWidth: system.deviceInfo().width,
                    designHeight: system.deviceInfo().height,
                    designOrientation: system.deviceInfo().orientation
                })
            }

            system
                .onDeviceDesignChange()
                .debounce({ delay: 200 })
                .subscribe(resizeRenderer);

            resizeRenderer();
        });

        // thread.execute('game-loop');

    })


})

