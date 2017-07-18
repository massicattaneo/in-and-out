function toCamelCase(string) {
    if (string.match(/\s|-|_/)) {
        return string.toLowerCase()
            .match(/([^\s|_|-]*)/g)
            .reduce((p, c) => p + c.charAt(0).toUpperCase() + c.slice(1).toString().toLowerCase());
    } else if (!string.match(/[a-z]/)) {
        return string.toLowerCase();
    }
    return string;
}

function convertStyleName(name) {
    switch (name) {
        case 'top':
            return 'y';
        case 'left':
            return 'x';
        case 'visibility':
            return 'visible';
        case 'opacity':
            return 'alpha';
        default:
            return toCamelCase(name);
    }
}

function convertStyleValue(string, name) {
    switch (name) {
        case 'top':
        case 'left':
        case 'width':
        case 'height':
        case 'border-width':
        case 'border-radius':
        case 'font-size':
        case 'radius':
            let value = string.replace('px', '');
            value = isNaN(value) ? value : parseFloat(value);
            return value;
        case 'border-color':
        case 'fill':
            return parseInt(string.replace(/^#/, ''), 16);
        case 'opacity':
            return parseFloat(string);
        case 'visibility':
            return string === 'visible';
        case 'pivot':
            var array = string.replace('px','').split(' ');
            return {x: parseFloat(array[0]), y: parseFloat(array[1])};
        case 'scale':
            return {x: parseFloat(string), y: parseFloat(string)};
        default:
            return string;
    }
}

function generateStyle(str) {
    return str.split(';')
        .map(style => style.trim())
        .filter(style => style !== '')
        .map((style) => {
            const name = style.substr(0, style.indexOf(':')).trim();
            const value = style.substr(style.indexOf(':') + 1).trim();
            return { name: convertStyleName(name), value: convertStyleValue(value, name) };
        })
}

function scssToJson(str) {
    var ret = {};
    const string = str.replace(/(\r\n|\n|\r)/gm, '').replace(/[\s]\s*/g, ' ').trim();

    function createNewRule(isStr) {
        const id = isStr.replace(/"/g, '').trim();
        return ret[id] || (ret[id] = { modes: {}, style: {} });
    }

    string.match(/[^{]*{[^{]*}/g)
        .filter(rule => rule.match(/#([^{]*)/))
        .map((rule) => {
            const match = rule.match(/#([^{]*)/);
            return {
                index: match.index,
                id: match[1],
                mode: rule.substr(1, match.index - 1).trim(),
                style: generateStyle(rule.match(/{(.*)}/)[1])

            };
        })
        .forEach((o) => {
            const style = {};
            o.style.forEach((stl) => {
                style[stl.name] = stl.value;
            });
            const newStyle = createNewRule(o.id);
            if (o.index === 0) {
                Object.assign(newStyle.style, style);
            } else {
                if (!newStyle.modes[o.mode]) {
                    newStyle.modes[o.mode] = {};
                }
                const s = newStyle.modes[o.mode];
                Object.assign(s, style);
            }
        });

    ret.animations = {};
    var animations = string.match(/@keyframes[^@]*}}/g) || [];
    animations.forEach(function (keyframes) {
        var animationName = keyframes.match(/\s([^@{]*)\s/)[1].trim();
        ret.animations[animationName] = keyframes.match(/\d*%\s{[^}]*}/g).map((step) => {
            const array = generateStyle(step.match(/{(.*)}/)[1]);
            const rules = {};
            array.forEach((stl) => {
                rules[stl.name] = stl.value;
            });
            return {
                percentage: Number(step.match(/(\d*)%/)[1]), rules
            };
        });
    });

    return ret;
}

module.exports = scssToJson;
