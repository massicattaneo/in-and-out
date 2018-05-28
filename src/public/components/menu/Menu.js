import { Node, HtmlStyle, HtmlView } from 'gml-html';
import menuListButtonTemplate from './menuListButton.html';
import menuItemButtonTemplate from './menuItemButton.html';

export default async function (container, { system, table, column }) {
    const obj = {};
    const locale = await system.locale(`/localization/common/es.json`);

    const types = system.store[table].reduce((a, b) => {
        if (b[column] && !a.find(i => i.item === b[column])) a.push({ href: b.menuhref, item: b[column] });
        return a;
    }, []);

    const listButton = HtmlView(menuListButtonTemplate, [], { path: `${locale.get(`urls.${table}`)}` });
    container.appendChild(listButton.get());


    const children = types.map(({ item, href }) => {
        const variables = Object.assign({ path: `${locale.get(`urls.${table}`)}/${href}`, item }, locale.get());
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
        });
    };

    obj.close = async function (href) {
        console.log(href)
        children.forEach(function (c, i) {
            c.style.transform = `translate(0px,-${50 * i}px)`;
            c.style.zIndex = (c.getAttribute('href').indexOf(href) !== -1) ? 2 : 1;
        });
        await system.wait.time(500);
        children.forEach(c => c.style.display = 'none');
        listButton.get().style.display = 'block';
        listButton.get().innerHTML = types.find(i => i.href === href).item;
    };

    obj.path = function (href) {
        return types.find(i => i.href === href).item;
    };

    return obj;
}