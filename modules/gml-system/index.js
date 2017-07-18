import Screen from './Screen';
import Resources from './Resources';
import Localization from './Localization';
import Storage from './Storage';
import Device from './Device';

export default function System(options) {
    const sys = {};
    const device = Device(window.navigator);
    const resources = Resources({ device });
    const storage = Storage({prefix: options.gameName});
    const localization = Localization();
    const screen = Screen(options.config, options.modes, {device});

    function global(fn) {
        return function (...args) {
            return fn(...args) || sys;
        }
    }

    sys.addManifest = global(resources.addManifest);
    sys.loadResourcesByTag = global(resources.loadByTag);
    sys.loadLocalization = global(localization.load);
    sys.fullScreenRenderer = global(screen.fullScreenRenderer);
    sys.centeredContainer = global(screen.centeredContainer);
    sys.getRenderer = global(screen.getRenderer);

    return sys;
}