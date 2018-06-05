const fs = require('fs');
const es = require('../static/localization/system/es.json');

function getTitle(string) {
    return es.documentWindowTitle.replace('{0}', string);
}

function map(sheets, posts) {
    const urls = [];
    const description = 'In&amp;Out es tu centro de belleza en Málaga por excelencia, pioneros en la técnica de la depilación con hilo en Málaga y en tratamientos de belleza.';
    const template = fs.readFileSync(__dirname + '/index.html', 'utf8');
    const homeHtml = template
        .replace('{{body}}', fs.readFileSync(__dirname + '/es/home.html', 'utf8'))
        .replace(/{{title}}/g, getTitle('Tu centro de belleza en Malaga'))
        .replace(/{{description}}/g, description);

    urls.push({ url: '', html: homeHtml });
    urls.push({ url: '/', html: homeHtml });
    urls.push({ url: '/es', html: homeHtml });

    function createHtmlList(appName, subpath = () => '') {
        const list = sheets[appName];
        return `
        <div>
            <h1>${es.apps[appName].windowTitle}</h1>
            <ul>
                ${list.map(function (item) {
            return `<li><a 
            href="/es/${es.apps[appName].url}${subpath(item)}/${item.href}">${item.titulo}</a></li>`;
        }).join('')}
            </ul>
        </div>
    `;
    }

    const oldUrls = ['beauty-corner', 'beauty-parties', null,'contacto', null,'in-out-go', null, 'quienes-somos'];
    ['beautycorner', 'beautyparties', 'bookings', 'callUs', 'hours', 'inandoutgo', 'photoMeasure', 'team']
        .forEach(function (name, index) {
            const app = es.apps[name];
            const html = template
                .replace('{{body}}', fs.readFileSync(__dirname + `/es/${name}.html`, 'utf8'))
                .replace(/{{title}}/g, getTitle(app.windowTitle))
                .replace(/{{description}}/g, app.windowDescription);
            const url = `/es/${app.url}`;
            urls.push({ url: url, html: html });
            if (oldUrls[index])
                urls.push({ url: `/oldUrls[index]/`, html: html });
                urls.push({ url: `/oldUrls[index]`, html: html });
        });

    ['promotions', 'bonusCards', 'news', 'press'].forEach(function (name) {
        const html = template
            .replace('{{body}}', createHtmlList(name))
            .replace(/{{title}}/g, getTitle(es.apps[name].windowTitle))
            .replace(/{{description}}/g, es.apps[name].windowDescription);
        urls.push({
            url: `/es/${es.apps[name].url}`,
            html: html
        });
        if (name === 'news') {
            urls.push({
                url: `/novedades/`,
                html: html
            });
            urls.push({
                url: `/novedades`,
                html: html
            });
        }
        urls.push(...sheets[name].map(item => {
            return {
                url: `/es/${es.apps[name].url}/${item.href}`,
                html: template
                    .replace('{{body}}', `
                            <h1>${item.titulo}</h1>
                            <img src="/google/drive/${es.apps[name].url}/desktop.${item.foto}"/>
                            <p>${item.descripcion}</p>`)
                    .replace(/{{title}}/g, `${getTitle(es.apps[name].windowTitle)} - ${item.titulo}`)
                    .replace(/{{description}}/g, item.descripcion)
            };
        }));
    });

    ['treatments'].forEach(function (name) {
        const html = template
            .replace('{{body}}', createHtmlList(name, item => `/${item.tipo.trim().toLowerCase().split(' ').join('-')}`))
            .replace(/{{title}}/g, getTitle(es.apps[name].windowTitle))
            .replace(/{{description}}/g, es.apps[name].windowDescription);
        urls.push({
            url: `/es/${es.apps[name].url}`,
            html: html
        });
        urls.push({
            url: `/tratamientos-de-belleza/`,
            html: html
        });
        urls.push({
            url: `/tratamientos-de-belleza`,
            html: html
        });
        urls.push(...sheets[name].map(item => {
            return {
                url: `/es/${es.apps[name].url}/${item.tipo.trim().toLowerCase().split(' ').join('-')}/${item.href}`,
                html: template
                    .replace('{{body}}', `
                            <h1>${item.titulo}</h1>
                            <img src="/google/drive/${es.apps[name].url}/desktop.${item.foto}"/>
                            <p>${item.descripcion}</p>`)
                    .replace(/{{title}}/g, `${getTitle(es.apps[name].windowTitle)} - ${item.titulo}`)
                    .replace(/{{description}}/g, item.descripcion)
            };
        }));
    });

    urls.push({
        url: `/es/${es.apps.photos.url}`,
        html: template
            .replace('{{body}}', `<div>LA FOTOS DE IN&OUT</div>`)
            .replace(/{{title}}/g, getTitle(es.apps.photos.windowTitle))
            .replace(/{{description}}/g, es.apps.photos.windowDescription)
    });

    posts
        .filter(p => p.post_type === 'post')
        .forEach(function (post) {
            urls.push({
                url: `/${post.post_name}`,
                html: template
                    .replace('{{body}}', `<h1>${post.post_title}</h1><p>${post.post_content}</p>`)
                    .replace(/{{title}}/g, getTitle(post.post_title))
                    .replace(/{{description}}/g, getTitle(post.post_excerpt))
            });
        });

    return urls;
}

module.exports = function (google, posts) {
    return map(google, posts).reduce((ret, item) => {
        ret[item.url] = item.html;
        return ret;
    }, {});
};