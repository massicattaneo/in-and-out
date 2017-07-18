import Container from 'gml-components/Container';
import Renderer from 'gml-components/Renderer';
import EventEmitter from '../gml-utils/EventEmitter';

export default function Screen({ resolution = 1, gameWidth, gameHeight }, modes = {}, { device }) {

    const screen = EventEmitter();
    const renderesFullScreen = [];
    const renderers = {};
    let activeMode = '';

    const resize = function() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const gameRatio = gameWidth / gameHeight;
        const windowRatio = windowWidth / windowHeight;
        let renderWidth = 0;
        let renderHeight = 0;

        if (windowRatio > gameRatio) {
            renderWidth = windowWidth / (windowHeight / gameHeight);
            renderHeight = gameHeight;
        } else {
            renderWidth = gameWidth;
            renderHeight = windowHeight / (windowWidth / gameWidth);
        }

        const newMode = Object.keys(modes).find((mode) => modes[mode]({ device }));
        if (newMode !== activeMode) {
            screen.emit('mode-change', { newMode, activeMode });
            activeMode = newMode;
        }

        renderesFullScreen.forEach(renderer => {
            renderer.resize({renderWidth, renderHeight, windowWidth, windowHeight})
            renderer.render();
        });

        screen.emit('resize', {});
    };

    screen.fullScreenRenderer = (id) => {
        const renderer = renderers[id] = Renderer();
        renderesFullScreen.push(renderer);
        resize();
    };

    window.addEventListener('resize', resize);
    resize();

    screen.getMode = () => {
        return activeMode;
    };
    
    screen.getRenderer = function (id) {
        return renderers[id];
    };

    return screen;
}
