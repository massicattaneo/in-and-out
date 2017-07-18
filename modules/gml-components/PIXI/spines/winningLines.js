/* eslint require-jsdoc: 'off' */
import spineAdapter from './spineAdapter';

export default function (options) {
    const CFG = {
        NAME_PLACEHOLDER: 'Symbol_Placeholder',
        ANIM_PREFIX: 'payline_',
        SYMBOL_PREFIX: 'Symbol_'
    };
    const obj = spineAdapter(options.resource);
    const WIDTH = 1280;
    const HEIGHT = 720;
    let _lines = options.lines;
    let _animationCounter = 0;
    let animationEndPromise;

    obj.init({
        width: WIDTH,
        height: HEIGHT,
        events: {
            start: (track) => {
                obj.emit('onStartWinningLine');
                if (_animationCounter === 0) {
                    obj.emit('onStartWinningLines');
                }
                if (track.animation.name.indexOf(CFG.ANIM_PREFIX) > -1) {
                    _animationCounter += 1;
                }
            },
            complete: (track) => {
                obj.emit('onEndWinningLine');
                if (_animationCounter === _lines.length &&
                    track.animation.name.indexOf(CFG.ANIM_PREFIX) > -1) {
                    animationEndPromise();
                    obj.emit('onEndWinningLines');
                }
            },
            event: (track, event) => {
                switch (event.data.name) {
                    case 'onOnsymbol':
                        obj.emit('onOnsymbol', event.stringValue);
                        break;
                    default:
                        obj.emit(event.data.name, {
                            track,
                            event
                        });
                        break;
                }
            }
        }
    });

    obj.setUp = (opt) => {
        _animationCounter = 0;
        _lines = opt.lines;
    };

    obj.showWinningLine = (line) => {
        const lastAnimationPlayed = obj.getLastAnimationPlayed();
        const lastAnimationPlayedTime = lastAnimationPlayed ? lastAnimationPlayed.animationEnd : 0;
        obj.getSlotsByAttachmentName(CFG.NAME_PLACEHOLDER).forEach((slot) => {
            obj.toggleElement(slot, false);
        });
        obj.getAnimationState().addAnimation(0, `${CFG.ANIM_PREFIX}${line}`, false, lastAnimationPlayedTime);
        obj.play();
    };

    obj.reset = () => {
        obj.getAnimationState() && obj.getAnimationState().clearTracks();
    };

    obj.start = () => {
        _lines.forEach((line) => {
            obj.showWinningLine(line);
        });
        return new Promise((resolve) => {
            animationEndPromise = resolve;
        });
    };

    return obj;
};
