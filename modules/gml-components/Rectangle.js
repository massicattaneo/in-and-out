import CanvasObject from './CanvasObject'

export default function({sys, renderer, template, style} = {}) {
    var obj = CanvasObject(sys);
    const s = style[template.attributes.id].style;
    var ctx = renderer.getContext();
    ctx.fillStyle = s.backgroundColor;
    ctx.rect(s.top || 0, s.left || 0, s.width || 0, s.height || 0);

    obj.update = function () {

    };

    obj.render = function () {
        console.log('here');
        ctx.fill();
    };

    return obj;
}