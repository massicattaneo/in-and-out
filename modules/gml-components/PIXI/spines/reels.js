/* eslint require-jsdoc: 'off' */

import spineAdapter from './spineAdapter';

class ReelSymbolIterator {
    constructor(array) {
        this.cursor = 0;
        this.array = array;
    }

    reset() {
        this.cursor = 0;
    }

    next(pos = 1) {
        if (this.cursor + pos < this.array.length) {
            this.cursor = this.cursor + pos;
        } else {
            this.cursor = pos - (this.array.length - this.cursor);
        }
        return this.array[this.cursor];
    }

    current() {
        return this.array[this.cursor];
    }

    goTo(pos) {
        this.cursor = 0;
        this.next(pos >= 0 ? pos : this.array.length - 1);
    }
}

export default function (options) {
    const getSlotName = (reel, slot) =>
        `Symbol_Slot_${slot}_Reel_${reel}`;

    const CFG = {
        NAME_SYMBOLS_SRC_SLOT: getSlotName(3, 2),
        NAME_PLACEHOLDER: 'Placeholder',
        ANIM_PREFIX: 'Reel_',
        SYMBOL_PREFIX: 'Symbol_',
    };

    // TODO these will come from the framework
    const WIDTH = 1280;
    const HEIGHT = 720;


    let _reels = [];
    const _numReels = options.numReels;
    const _numSymbols = options.numSymbols;
    const obj = spineAdapter(options.resource);

    // states
    let _stopPositions = [];
    let _isStopping = false;
    // end states
    const _slotSymbols = {};
    const _symbolIterators = {};
    let animationEndPromise;

    const getReelAnimation = index =>
        obj.getSkeletonData().animations.find(animation => animation.name === `${CFG.ANIM_PREFIX}${index}`);

    const setSymbol = (reelIndex, pos, symbolTo) => {
        const slotName = getSlotName(reelIndex, pos);
        const isInit = !_slotSymbols[slotName];
        const reelAnimation = getReelAnimation(reelIndex);
        const slotIndex = obj.getSkeletonData().findSlotIndex(slotName);
        const timeline = obj.getTimeLineFromSlotIndex(reelAnimation, slotIndex, 'AttachmentTimeline');

        timeline.attachmentNames.forEach((frame, index, arr) => {
            /* eslint no-param-reassign: ["error", { "props": false }]*/
            const symbolFrom = isInit ? CFG.NAME_PLACEHOLDER : _slotSymbols[slotName];
            arr[index] = arr[index].replace(symbolFrom, symbolTo);
        });
        _slotSymbols[slotName] = symbolTo;
    };

    const setUpSpineSkin = () => {
        const skin = obj.getSkeleton().skin;
        const attachments = obj.getFullSetOfSymbol();
        obj.getSkeleton().slots.filter(slot =>
            slot.data.name.indexOf(CFG.SYMBOL_PREFIX) > -1 && slot.data.name !== CFG.NAME_SYMBOLS_SRC_SLOT
        ).forEach((slot) => {
            Object.keys(attachments).forEach((attachmentName) => {
                skin.addAttachment(slot.data.index, attachmentName, attachments[attachmentName]);
            });
        });
    };

    const updateSymbols = (reelIndex, pos) => {
        const slotName = getSlotName(reelIndex, pos);
        setSymbol(reelIndex, pos, _symbolIterators[slotName].current());
        _symbolIterators[slotName].next(_numSymbols + 1);
    };

    const reelRotation = (reelIndex, slotIndex) => {
        updateSymbols(reelIndex, slotIndex);
        if (!_isStopping) return;
        const stopPosition = _stopPositions[reelIndex - 1];
        Array(_numSymbols).fill().forEach((slot, index) => {
            const name = getSlotName(reelIndex, index + 1);
            _symbolIterators[name].goTo(stopPosition + [-1, 0, 1][index]);
        });
    };


    const updateReels = (reelsConfig) => {
        _reels = reelsConfig || _reels;
        Array(_numReels).fill().forEach((reel, reelIndex) => {
            Array(_numSymbols + 1).fill().forEach((slot, slotIndex) => {
                const slotName = getSlotName(reelIndex + 1, slotIndex + 1);
                const symb = _symbolIterators[slotName].current();
                setSymbol(reelIndex + 1, slotIndex + 1, symb);
            });
        });
    };

    obj.reset = () => {
        _isStopping = false;
        _stopPositions = [];
        Array(_numReels).fill().forEach((reel, reelIndex) => {
            const spineAnimation = obj.getAnimations()[`${CFG.ANIM_PREFIX}${reelIndex + 1}`];
            obj.setAnimationSpeed(spineAnimation, 1);
        });
    };

    obj.setReelsSymbols = (reelsConfig) => {
        _reels = reelsConfig;
        Array(_numReels).fill().forEach((reel, reelIndex) => {
            Array(_numSymbols + 1).fill().forEach((slot, slotIndex) => {
                const slotName = getSlotName(reelIndex + 1, slotIndex + 1);
                _symbolIterators[slotName] = new ReelSymbolIterator(_reels[reelIndex]);
                _symbolIterators[slotName].next(slotIndex);
            });
        });
    };

    obj.getFullSetOfSymbol = () =>
        obj.getAttachmentsBySlotName(CFG.NAME_SYMBOLS_SRC_SLOT);


    obj.spinStart = () => {
        obj.play();
        Array(_numReels).fill().forEach((reel, reelIndex) => {
            obj.getAnimations()[`${CFG.ANIM_PREFIX}${reelIndex + 1}`].trackTime = 0;
        });
        return new Promise((resolve) => {
            animationEndPromise = resolve;
        });
    };

    obj.spinStop = (symbols, stopNow) => {
        _stopPositions = [];
        Array(_numReels).fill().forEach((reel, reelIndex) => {
            const spineAnimation = obj.getAnimations()[`${CFG.ANIM_PREFIX}${reelIndex + 1}`];
            _stopPositions.push(symbols[reelIndex]);
            if (stopNow) {
                obj.setAnimationSpeed(spineAnimation, 3.5);
            }
        });
    };

    obj.getSlotSymbols = () =>
        _slotSymbols;


    obj.getSlotName = getSlotName;

    obj.init({
        width: WIDTH,
        height: HEIGHT,
        isOnStage: true,
        events: {
            complete: () => {
                animationEndPromise();
                obj.emit('onEndAnimation');
            },
            event: (track, event) => {
                switch (event.data.name) {
                    case 'onBeforeEndSpin':
                        _isStopping = true;
                        obj.emit('onBeforeEndSpin');
                        break;
                    case 'onEndSpin':
                        obj.emit('onEndReelSpin', track.animation.name);
                        if (track.animation.name !== `${CFG.ANIM_PREFIX}${_numReels}`) return;
                        obj.emit('onEndSpin');

                        break;
                    case 'onOffScreen': {
                        const reelIndex = parseInt(track.animation.name.replace(CFG.ANIM_PREFIX, ''), 10);
                        reelRotation(reelIndex, event.intValue);
                        break;
                    }
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

    obj.setUp = (reelsConfig) => {
        setUpSpineSkin();
        obj.setReelsSymbols(reelsConfig);
        updateReels();
    };

    return obj;
};
