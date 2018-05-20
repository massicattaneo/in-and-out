import {Node, HtmlStyle, HtmlView} from 'gml-html';
import menuListButtonTemplate from './menuListButton.html';
import menuItemButtonTemplate from './menuItemButton.html';

export default async function (container, {system}) {
    const obj = {};
    const locale = await system.locale(`/localization/common/es.json`);
    locale.load(`/localization/treatments/es.json`);
    const types = system.store.treatments.reduce((a, b) => {
        const type = b.tipo;
        if (b.tipo && a.indexOf(type) === -1) a.push(type);
        return a;
    }, []);

    const listButton = HtmlView(menuListButtonTemplate, [], locale.get());
    container.appendChild(listButton.get());

    const paths = {};
    const children = types.map(item => {
        const path = item.toLowerCase().replace(/\s/g, '-').replace(/ó/g, 'o');
        paths[path] = item;
        const variables = Object.assign({path, item}, locale.get());
        const childView = HtmlView(menuItemButtonTemplate, [], variables);
        container.appendChild(childView.get());
        return childView.get();
    });


    obj.open = async function () {
        listButton.get().style.display = 'none';
        children.forEach(c => c.style.display = 'block');
        await system.wait.time(0);
        children.forEach(function (c, i) {
            c.style.transform = `translate(0px, 0px)`;
        })
    };

    obj.close = async function (path) {
        children.forEach(function (c, i) {
            c.style.transform = `translate(0px,-${50*i}px)`;
            c.style.zIndex = (c.getAttribute('href').indexOf(path) !== -1) ? 2 : 1;
        });
        await system.wait.time(500);
        children.forEach(c => c.style.display = 'none');
        listButton.get().style.display = 'block';
        listButton.get().innerHTML = paths[path];
    };

    obj.path = function (path) {
        return paths[path];
    };

    return obj
}