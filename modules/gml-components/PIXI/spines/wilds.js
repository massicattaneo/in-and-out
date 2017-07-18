/* eslint require-jsdoc: 'off' */

import spineAdapter from './spineAdapter';

export default function (options) {
    const obj = spineAdapter(options.resource);
    const WIDTH = 1280;
    const HEIGHT = 720;

    obj.init({
        width: WIDTH,
        height: HEIGHT
    });

    obj.reset = () => {
        obj.getContent().visible = false;
        obj.getAnimationState().clearTracks();
    };

    obj.start = (firstTime) => {
        const animations = obj.getSkeletonData().animations;
        const animation = firstTime ? 'expanding_wild_in' : 'expanding_wild_progress';
        obj.getAnimationState().setAnimation(animations.length, animation, false).trackTime = 0;
        obj.play();
    };


    return obj;
};
