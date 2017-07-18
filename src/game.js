import System from 'gml-system';
import { UseCasesManager } from 'gml-utils';

import { default as gameStart } from './use-cases/game-start';
import { default as preloadStart } from './use-cases/preload-start';
import { default as idle } from './use-cases/idle';

import { default as events } from './use-cases/events';
import { default as errors } from './use-cases/errors';

import { default as Preloader } from './gos/preloader/controller';

(async function start() {

    const config = {
        gameWidth: 2560,
        gameHeight: 1449,
        gameName: 'FastAndSexy'
    };
    const data = {
        balance: { amount: 1000 },
        bet: { amount: 1 },
        autoSpin: { amount: 0 },
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        totalWin: 0
    };
    const modes = {
        desktop: function ({ device }) {
            return device.type === 'desktop';
        },
        portrait: function () {
            return document.documentElement.clientHeight > document.documentElement.clientWidth
        },
        landscape: function () {
            return document.documentElement.clientHeight <= document.documentElement.clientWidth
        }
    };
    const system = System({ modes, data, config });

    system.addManifest({
        "base": "assets/",
        "files": [{ "url": 'Winning_Highest_2.png', "tags": ["preload"], "qualities": [0.5, 1] }]
    });

    await system.loadLocalization('localization/en.json');
    await system.loadResourcesByTag('preload');

    system.fullScreenRenderer('renderer');

    /** PRELOADING */
    const preloader = Preloader(system);
    const preloadManager = UseCasesManager({ useCases: { preloadStart }, gos: { preloader }, system, config });
    await preloadManager.enter('preloadStart');

    /** START GAME */
    const gos = { preloader };
    const useCases = { gameStart, idle };

    const gameManager = UseCasesManager({ useCases, gos, errors, system, config, events });
    await gameManager.enter('gameStart');

})();
