import { default as Reels } from './spines/reels';
import { default as Wilds } from './spines/wilds';
import { default as WinningLines } from './spines/winningLines';

const factory = {
    container: function (style) {
        const pixi = new PIXI.Container();
        Object.assign(pixi, style);
        return { getPIXI: ()=> pixi };
    },
    rectangle: function (style) {
        const graphics = new PIXI.Graphics();
        style.backgroundColor && graphics.beginFill(style.backgroundColor);
        graphics.lineStyle(style.borderWidth, style.borderColor);
        graphics.drawRoundedRect(style.x, style.y, style.width, style.height, style.borderRadius);
        return { getPIXI: ()=> graphics };
    },
    text: function (style, value) {
        const t = new PIXI.Text(value, new PIXI.TextStyle(style));
        Object.assign(t, style);
        return { getPIXI: ()=> t };
    },
    circle: function (style, value) {
        const circle = new PIXI.Graphics();
        circle.beginFill(style.backgroundColor);
        circle.lineStyle(style.borderWidth, style.borderColor);
        circle.drawCircle(style.x, style.y, style.radius);
        circle.endFill();
        return { getPIXI: ()=> circle };
    },
    img: function (style, value, attributes, resources) {
        const sprite = new PIXI.Sprite(resources[attributes.src].texture);
        Object.assign(sprite, style);
        return { getPIXI: ()=> sprite };
    },
    reels: function (style, value, attributes, resources) {
        const reels = Reels({
            resource: resources[attributes.resource],
            numReels: attributes.numOfReels,
            numSymbols: attributes.numOfSymbols
        });
        return reels;
    },
    winnings: function (style, value, attributes, resources) {
        const wl = WinningLines({
            resource: resources[attributes.resource]
        })
        return wl;
    },
    wilds: function (style, value, attributes, resources) {
        const wilds = Wilds({
            resource: resources[attributes.resource]
        });
        return wilds;
    }
};

export default factory;
