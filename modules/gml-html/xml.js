const tagRegEx = /(<\/?[a-z][a-z0-9]*(?::[a-z][a-z0-9]*)?\s*(?:\s+[a-z0-9-_]+=(?:(?:'[\s\S]*?')|(?:"[\s\S]*?")))*\s*\/?>)|([^<]|<(?![a-z\/]))*/gi;
const tagNameRegEx = /^<([^\s-]*).*>$/;
const attributesRegEx = /\s[a-z0-9-_]+\b(\s*=\s*('|")[\s\S]*?\2)?/gi;

const createChild = (name, parent) => {
    const ret = {
        name,
        children: [],
        attributes: {},
        parent,
        content: '',
        autoClosing: false
    };
    return ret;
};

const convertValue = value => {
    const ret = value.toString()
        .replace(/"/g, '')
        // .replace(/'/g, '')
        .trim();
    return isNaN(ret) ? ret : (Number(ret));
};

const xmlToJson = (svgString, root = false) => {
    const target = createChild('root');
    let ref = target;
    svgString.replace(/\n/g, '')
        .replace(/\s\s/g, '')
        .match(tagRegEx)
        .forEach(function (line) {
            if (!line.match(/^<\//) && line.match(/^</)) {
                const item = createChild(line.match(tagNameRegEx)[1].replace('/', ''), ref);
                item.autoClosing = line.endsWith('/>');
                const attr = line.match(attributesRegEx);
                if (attr) {
                    attr.forEach(function (a) {
                        const [name, ...values] = a.split('=');
                        item.attributes[name.trim()] = convertValue(values.join('='));
                    });
                }
                ref.children.push(item);
                if (line.indexOf('/>') === -1) {
                    ref = item;
                }
            } else if (line.match(/^<\//)) {
                ref = ref.parent || target;
            } else {
                ref.content += line.trim();
            }
        });
    return root ? target : target.children[0];
};

module.exports = {
    xmlToJson
};
