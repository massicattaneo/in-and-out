const fs = require('fs');
const es = require('../static/localization/system/es.json');

function getTitle(string) {
    return es.documentWindowTitle.replace('{0}', string);
}

function map(sheets) {
    const urls = [];
    const template = fs.readFileSync(__dirname + '/index.html', 'utf8');
    const homeHtml = template
        .replace('{{body}}', fs.readFileSync(__dirname + '/es/home.html', 'utf8'))
        .replace('{{title}}', getTitle('Tu centro de belleza en Malaga'));
    urls.push({ url: '', html: homeHtml });
    urls.push({ url: '/', html: homeHtml });
    urls.push({ url: '/es', html: homeHtml });

    function createHtmlList(appName) {
        const list = sheets[appName];
        return `
        <div>
            <h1>${es.apps[appName].windowTitle}</h1>
            <ul>
                ${list.map(function (item) {
                    return `<li><a href="/es/${es.apps[appName].url}/${item.href}">${item.titulo}</a></li>`
                }).join('')}
            </ul>
        </div>
    `;
    }

    ['beautycorner', 'beautyparties', 'bookings', 'callUs', 'hours', 'inandoutgo', 'photoMeasure', 'team']
        .forEach(function (name) {
            const app = es.apps[name];
            urls.push({
                url: `/es/${app.url}`,
                html: template
                    .replace('{{body}}', fs.readFileSync(__dirname + `/es/${name}.html`, 'utf8'))
                    .replace('{{title}}', getTitle(app.windowTitle))
            });
        });

    ['promotions', 'treatments', 'bonusCards', 'news', 'press'].forEach(function (name) {
        urls.push({
            url: `/es/${es.apps[name].url}`,
            html: template
                .replace('{{body}}', createHtmlList(name))
                .replace('{{title}}', getTitle(es.apps[name].windowTitle))
        });
        urls.push(...sheets[name].map(item => {
            return {
                url: `/es/${es.apps[name].url}/${item.href}`,
                html: template
                    .replace('{{body}}', `<h1>${item.titulo}</h1><p>${item.descripcion}</p>`)
                    .replace('{{title}}', `${getTitle(es.apps[name].windowTitle)} - ${item.titulo}`)
            };
        }));
    });

    urls.push({
        url: `/es/${es.apps.photos.url}`,
        html: template
            .replace('{{body}}', 'LA FOTOS DE IN&OUT')
            .replace('{{title}}', getTitle(es.apps.photos.windowTitle))
    });

    return urls;
}

module.exports = function (google) {
    return map(google).reduce((ret, item) => {
        ret[item.url] = item.html;
        return ret;
    }, {});
};