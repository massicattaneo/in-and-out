/* eslint require-jsdoc: 'off' */
/* eslint no-underscore-dangle: 'off' */


import { default as EventEmitter } from '../../../eventEmitter';

const spineModel = (resource) => {
    const obj = {};

    const animations = [];
    const timelines = {};
    Object.assign(obj, EventEmitter());
    const _resourceAnimations = resource.animations;


    Object.keys(_resourceAnimations).forEach((animationKey) => {
        const animation = _resourceAnimations[animationKey];
        animations.push(animation);
        if (animation.bones) {
            Object.keys(animation.bones).forEach((boneKey) => {
                timelines[boneKey] = animation.bones[boneKey];
            });
        }
        if (animation.slots) {
            Object.key(animation.slots).forEach((slotKey) => {
                timelines[slotKey] = animation.slots[slotKey];
            });
        }
    });

    obj.getBoneTimeLines = boneName =>
        timelines[Object.keys(timelines).find(timeline =>
            timeline === boneName
        )];

    obj.getBoneTimeLine = (boneName, type) =>
        obj.getBoneTimeLines(boneName)[type];


    obj.getSlotTimeLines = slotName =>
        timelines[Object.keys(timelines).find(timeline =>
            timeline === slotName
        )];

    obj.getSlotTimeLine = (slotName, type) =>
        obj.getSlotTimeLines(slotName)[type];

    return obj;
};

export default spineModel;
