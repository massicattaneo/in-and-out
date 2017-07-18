import { default as factory } from './factory';

function toCamelCase(string) {
    if (string.match(/\s|-|_/)) {
        string = string.toLowerCase();
        const a = string.match(/([^\s|_|-]*)/g);
        return a.reduce(function (p, c) {
            return p + c.charAt(0).toUpperCase() + c.slice(1).toString().toLowerCase();
        });
    } else if (!string.match(/[a-z]/)) {
        return string.toLowerCase();
    }
    return string;
}

function parseValue(loc, value) {
    if (value.indexOf('{{') !== -1) {
        return loc.get(value.replace('{{', '').replace('}}', ''));
    }
    return value;
}

function replaceVariables(config, value) {
    if (value.toString().indexOf('$') !== -1) {
        return config[toCamelCase(value.replace('$', ''))];
    }
    return value;
}
function addTapEvents(o, attribute, wrapper) {
    if (attribute) {
        const pixiObj = o.getPIXI();
        pixiObj.interactive = true;
        pixiObj.buttonMode = true;
        pixiObj.on('pointerdown', () => {
            wrapper.emit(attribute);
        });
    }
}

import { default as EventEmitter } from '../../eventEmitter';


export default function ({ template, style, resources, config, screen, localization }) {
    const objects = {};
    const res = resources.get();
    const activeParentId = template.attributes.parent;
    const wrapper = factory[toCamelCase(template.name)](style[template.attributes.id].rules, parseValue(localization, template.value), template.attributes, res);

    function addChildren(parent, children, style) {
        children.forEach(function (template) {
            const pixiObj = factory[toCamelCase(template.name)](style[template.attributes.id].rules, parseValue(localization, template.value), template.attributes, res);
            addTapEvents(pixiObj, template.attributes.onTapFire, wrapper);
            objects[template.attributes.id] = pixiObj;
            parent.getPIXI().addChild(pixiObj.getPIXI());
            addChildren(pixiObj, template.children, style);
        });
    }

    Object.assign(wrapper, EventEmitter());

    Object.keys(style)
        .filter(id => id !== 'animations')
        .forEach((id) => {
        Object.keys(style[id].rules).forEach((rule) => {
            style[id].rules[rule] = replaceVariables(config, style[id].rules[rule]);
        });
    });
    addTapEvents(wrapper, template.attributes['on-tap-fire'], wrapper);
    objects[template.attributes.id] = wrapper;
    addChildren(wrapper, template.children, style);


    wrapper.get = (name) => {
        if (!name) return wrapper;
        return objects[name];
    };

    wrapper.PIXI = (name) => {
        if (!name) return wrapper.getPIXI();
        return objects[name].getPIXI();
    };

    wrapper.setMode = (mode) => {
        Object.assign(wrapper.getPIXI(), style[template.attributes.id].rules, style[template.attributes.id].modes[mode]);
    };

    wrapper.activate = () => {
        const parent = screen.getContainer(activeParentId);
        parent.addChild(wrapper.getPIXI());
        screen.render();
    };

    wrapper.deactivate = () => {
        const parent = screen.getContainer(activeParentId);
        parent.removeChild(wrapper.getPIXI());
        screen.render();
    };

    wrapper.setMode(screen.getMode());

    return wrapper;
}
