import { wait } from 'gml-utils';

export default async function (sys, gos) {
    // gos.preloader.activate();
    await sys.loadResourcesByTag('game', function (loader) {
        gos.preloader.updateFromData(loader.progress/2)
    });
    await wait.time(100);

}
