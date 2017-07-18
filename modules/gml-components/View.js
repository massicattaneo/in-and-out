import container from './Container';
import rectangle from './Rectangle';

const Component = { container, rectangle };

export default function (sys, template, style) {
    const obj = {};
    const children = [];
    var renderer = sys.getRenderer(template.attributes.renderer);
    const main = Component[template.name]({sys, renderer, template, style});
    renderer.append(main);

    function addChildren(childs) {
        childs.forEach(function (child) {
            children.push(Component[child.name]({sys, renderer, template: child, style}));
            addChildren(child.children)
        })
    }
    addChildren(template.children);
    obj.render = function () {
        main.render();
        children.forEach(child => child.render());
    };
    renderer.render(obj);

    return obj;
}