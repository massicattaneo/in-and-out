/* eslint-disable no-plusplus */
import { xmlToJson } from './xml';

export const template = (html, variables) => {
    if (!variables) return html;
    const array = Object.keys(variables);
    return array.reduce((string, key) => {
        const regExp = new RegExp(`{{${key}}}`, 'g');
        return string.replace(regExp, variables[key]);
    }, html);
};

const takeOrGenerate = (dom, virtual, index = 0) => {
    let element = dom.children.item(index);
    if (!element) {
        element = document.createElement(virtual.name);
        dom.appendChild(element);
    }
    return element;
};

const takeOrGenerateText = (dom, virtual) => {
    let element;
    for (let i = 0; i < dom.childNodes.length; i++) {
        if (dom.childNodes[i] instanceof Text) {
            element = dom.childNodes[i];
            if (element.textContent !== virtual.content) {
                element.textContent = virtual.content;
            }
            break;
        }
    }
    if (!element) {
        element = document.createTextNode(virtual.content);
        dom.appendChild(element);
    }
    return element;
};

const generate = (dom, virtual) => {
    Object.keys(virtual.attributes).forEach(name => {
        if (dom.getAttribute(name) !== virtual.attributes[name]) {
            dom.setAttribute(name, virtual.attributes[name]);
        }
    });
    if (virtual.content) takeOrGenerateText(dom, virtual);
    virtual.children.forEach((child, index) => {
        const existing = takeOrGenerate(dom, child, index);
        generate(existing, child);
    });
    while (dom.children.length > virtual.children.length) {
        dom.removeChild(dom.children[dom.children.length - 1]);
    }
};

export const renderToDOM = (dom, callback) => {
    const el = xmlToJson(callback());
    generate(dom, el);
};
