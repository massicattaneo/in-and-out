// TODO - Use pandora bus or mitt
import { default as EventEmitter } from '../../../eventEmitter';


const timeLineFactory = (frames, type) => {
    const timelineType = {
        rotate: {

        },
        translate: {
            proto: 'TranslateTimeline',
            setFrame: (frame, index) => {
                timeline.setFrame(index, frame.time, frame.x, frame.y);
            }
        },
        shear: {

        },
        attachment: {

        },
        color: {
            proto: 'ColorTimeline',
            setFrame: (frame, index) => {
                const col = new PIXI.spine.core.Color();
                col.setFromString(frame.color);
                timeline.setFrame(index, frame.time, col.r, col.g, col.b, col.a);
            }
        },
        deform: {

        },
        scale: {
            proto: 'ScaleTimeline',
            setFrame: (frame, index) => {
                timeline.setFrame(index, frame.time, frame.x, frame.y);
            }
        }
    };

    const factory = timelineType[type];

    const timeline = new PIXI.spine.core[factory.proto](frames.length);
    frames.forEach(factory.setFrame);
    return timeline;
};

const spine = (resource) => {
    const CFG = {
        NAME_PLACEHOLDER: 'Placeholder',
        NAME_DEFAULT_SPINE_SKIN: 'default',
        SPEED: 1
    };

    const obj = {};
    const _resource = resource;

    const _spineAnimations = {};
    let _skeleton;
    let _spineSkeleton;
    let _animationState;
    let _spineObj;
    let _skeletonData;
    let _width;
    let _height;
    let _events;
    let _isOnStage;
    let _isInit;

    Object.assign(obj, EventEmitter());

    const calculateBounds = () => {
        const offset = {
            x: 0,
            y: 0
        };

        const size = {
            x: _width * 2,
            y: _height * 2
        };

        return {
            offset,
            size
        };
    };

    const loadSkeleton = (res) => {
        _spineObj = new PIXI.spine.Spine(res);
        _skeletonData = _spineObj.spineData;
        const skeleton = _spineObj.skeleton;
        const bounds = calculateBounds(_spineObj);

        return {
            skeleton,
            state: _spineObj.state,
            bounds: [bounds]
        };
    };

    const setUpSpine = () => {
        _skeleton = loadSkeleton(_resource.spineData);
        _spineSkeleton = _skeleton.skeleton;
        _spineSkeleton.setSkinByName(CFG.NAME_DEFAULT_SPINE_SKIN);
    };

    const setUpEvents = () => {
        if (_events) {
            _spineObj.state.addListener(_events);
        }
    };

    const setUpAnimations = () => {
        _animationState = _skeleton.state;
        _animationState.timeScale = 0;
        if (!_isOnStage) {
            return;
        }
        _skeletonData.animations.forEach((animation, index) => {
            const animName = animation.name;
            _spineAnimations[animName] = _animationState.addAnimation(index, animName, false);
        });
    };

    obj.play = () => {
        obj.setSpeed(1);
    };

    obj.stop = () => {
        obj.setSpeed(0);
    };

    obj.playAnimation = (animation) => {
        obj.setAnimationSpeed(animation, 1);
    };

    obj.stopAnimation = (animation) => {
        obj.setAnimationSpeed(animation, 0);
    };

    obj.getEndAnimationPromise = animation => new Promise((resolve) => {
        animation.listener = {
            end: (track, event) => {
                resolve();
            }
        };
    });

    obj.reset = () => {
        obj.getAnimationState().clearTracks();
        obj.getAnimationState().tracks.forEach((track) => {
            track.trackTime = 0;
        });
    };

    obj.getLastAnimationPlayed = () => {
        const numTracks = obj.getAnimationState().tracks.length;
        return obj.getAnimationState().tracks[numTracks - 1];
    };

    obj.setAnimationSpeed = (animation, speed) => {
        animation.timeScale = speed;
    };

    obj.setSpeed = (speed) => {
        _animationState.timeScale = speed;
    };

    obj.render = () => {};

    obj.resize = () => {
        if (!_isInit) return;
        const bounds = _skeleton.bounds[0];
        const scaleX = _width / bounds.size.x;
        const scaleY = _height / bounds.size.y;
        const scale = Math.max(scaleX, scaleY);
        _spineObj.position.set(0, 0);
        _spineObj.scale.set(scale, scale);
    };

    obj.toggleElement = (element, status) => {
        const type = element.constructor.name;
        const el = element;
        switch (type) {
        case 'Slot': {
            const current = el.currentSprite.renderable;
            el.currentSprite.renderable = (status !== undefined) ? status : !current;
        }
            break;
        case 'Container': {
            const current = el.renderable;
            el.renderable = (status !== undefined) ? status : !current;
        }
            break;
        default:
            break;
        }
    };

    obj.createAnimationWithTimelines = (frames, type, el) => new Promise((resolve, reject) => {
        const timelines = [];
        const animName = `_${Math.random().toString(36).substr(2, 9)}`;
        const time = frames[frames.length - 1].time;
        const timeline = timeLineFactory(frames, type);
        timeline.boneIndex = el.boneIndex;
        timeline.slotIndex = el.slotIndex;
        timelines.push(timeline);
        const tempAnim = new PIXI.spine.core.Animation(animName, timelines, time);
        _skeletonData.animations.push(tempAnim);
        const track = _animationState.addAnimation(_skeletonData.animations.length, animName, false, 0);

        track.listener = {
            complete: () => {
                resolve();
            }
        };
    });

    obj.findTrackByName = name => obj.getAnimationState().tracks.find(track => track.animation && track.animation.name === name);

    obj.getAttachmentsBySlotName = (slotName) => {
        const index = obj.getSkeletonData().findSlotIndex(slotName);
        const skin = obj.getSkeleton().skin;
        return skin.attachments[index];
    };

    obj.getSlotsByName = name => obj.getContent().skeleton.slots.find(slot => slot.data.name === name);

    obj.getSlotsByAttachmentName = name => obj.getContent().skeleton.slots.filter(slot => slot.data.attachmentName === name);

    obj.getTimeLineFromSlotIndex = (animation, index, type) =>
        animation.timelines.find(timeline =>
            timeline.slotIndex === index && timeline.constructor.name === type
        );

    obj.getContent = () =>
        _spineObj;

    obj.getPIXI = () =>
        _spineObj;

    obj.getStateData = () =>
        _spineObj.stateData;

    obj.getAnimations = () =>
        _spineAnimations;


    obj.getAnimationState = () =>
        _animationState;

    obj.getSkeleton = () =>
        _spineObj.skeleton;


    obj.getSkeletonData = () =>
        _skeletonData;

    obj.getSpineModel = () =>
        _resource.data;

    obj.getSlotPixiContainer = (slotName) => {
        const index = _skeletonData.findSlotIndex(slotName);
        return obj.getContent().slotContainers[index];
    };

    obj.animateSymbolByBone = (boneName, type, frames) => {
        const boneIndex = obj.getSkeletonData().findBoneIndex(boneName);
        return obj.createAnimationWithTimelines(frames, type, {
            boneIndex
        });
    };

    obj.addTrackEvent = (eventName, track, callback) => {
        track.listener = {
            event: (track, event) => {
                if (event.data.name === eventName) {
                    callback.apply(obj);
                }
            }
        };
    };

    obj.getIsInit = () => _isInit;

    obj.init = (options) => {
        _width = options.width;
        _height = options.height;
        _events = options.events;
        _isOnStage = options.isOnStage;
        _isInit = true;
        setUpSpine();
        setUpEvents();
        setUpAnimations();
    };

    return obj;
};

export default spine;
