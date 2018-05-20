import {$Container, $Hero, $Sky, $Clouds, $House, $Level1, tweens} from './style.scss';
import {Drawable, Rectangle, Image, Renderable, Transform, Cachable, Group, Tween, Map} from 'gml-components';
import map from './level-1.map';

export default function ({ system, context, drawer }) {
    const obj = {};
    const walking = Tween(tweens['walk'], context);
    const walkLong = Tween(tweens['walkLong'], context);

    let sky = Drawable($Sky, drawer('rectangle'));
    let hero = Drawable($Hero, drawer('image'));
    let clouds = Drawable($Clouds, drawer('image'));
    let house = Drawable($House, drawer('image'));
    let level1 = Drawable($Level1, drawer('map', { map }));
    let walk = walking.run({ duration: 500, times: -1 });

    // hero
    //     .before(walk)
    //     .before(walkLong.run({ duration: 5000, times: 1 }).then(function (runner) {
    //         hero.hide();
    //         hero.removeBefore(walk);
    //         hero.removeBefore(runner);
    //     }));


    let group = Group($Container, { sky, clouds, house, level1, hero });

    Renderable(obj, { group });

    return obj;
}
