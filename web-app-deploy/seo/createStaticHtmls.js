const fs = require('fs');
const es = require('../static/localization/system/es.json');
const fonts = require('../static/assets/fonts/font.manifest.json');
const striptags = require('striptags');

function getTitle(string) {
    return es.documentWindowTitle.replace('{0}', string);
}

const cssStyleFont = function ({ name, url }) {
    const noExtUrl = url.substr(0, url.length - 4);
    return `@font-face {
          font-family: ${name};
          src: url("${noExtUrl}.eot");
          src: url("${noExtUrl}.eot?#iefix") 
          format("embedded-opentype"), url("${noExtUrl}.woff2") 
          format("woff2"), url("${noExtUrl}.woff") 
          format("woff"), url("${noExtUrl}.ttf") 
          format("truetype"), url("${noExtUrl}.svg#webfont") format("svg");
          font-weight: normal;
          font-style: normal; }`;
};
const webSiteUrl = 'https://www.inandoutbelleza.es';
function getBreadcrumbItems(items) {
    return items.map((i, index, array) => {
        return {
            '@type': 'ListItem',
            'position': index + 1,
            'item': {
                '@id': `${webSiteUrl}/${array.slice(0, index + 1).join('/')}`,
                'name': i
            }
        };
    });
}

function createBreadcrumb(url) {
    const items = url.split('/').filter(i => i);
    return `<ul class="breadcrumb">
        ${items.map((i, index, array) => `<li><a href="/${array.slice(0, index + 1).join('/')}">${i}</a></li>`).join(' > ')}
        </ul>
        <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": ${JSON.stringify(getBreadcrumbItems(items))}
            }
        </script>
        `;
}

function parseUrlTreatmentType(string) {
    return string.toLowerCase().replace(/\s/g, '-').replace(/ó/g, 'o');
}

function getLastmodISO(string) {
    return new Date(string.split('/').reverse().join('-')).toISOString();
}

function map(template, google, posts) {
    const urls = [];
    const description = 'In&amp;Out es tu centro de belleza en Málaga por excelencia, pioneros en la técnica de la depilación con hilo en Málaga y en tratamientos de belleza.';
    const homeHtml = template
        .replace('{{body}}', fs.readFileSync(__dirname + '/es/home.html', 'utf8'))
        .replace(/{{title}}/g, getTitle('Tu centro de belleza en Malaga'))
        .replace(/{{image}}/g, 'https://www.inandoutbelleza.es/assets/images/manzana.png')
        .replace(/{{description}}/g, description);

    urls.push({ url: '', html: homeHtml });
    urls.push({ url: '/', html: homeHtml });
    urls.push({ url: '/es', html: homeHtml });

    function createHtmlList(appName, subpath = () => '') {
        const list = google[appName];
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

    function createTreatmentSchema(item, url) {
        return `<script type="application/ld+json">
    {
        "@context": "http://schema.org",
        "@type": "Service",
        "serviceType": "Beauty - ${item.tipo}",
        "areaServed": [
            {
                "@type": "City",
                "name": "Malaga",
                "@id": "https://it.wikipedia.org/wiki/Malaga"
            }
        ],
        "provider": {
            "@type": "Organization",
            "name": "In&Out Belleza",
            "@id": "${webSiteUrl}${url}"
        },
        "description": "${item.descripcion}",
        "name": "${item.titulo}"
    }
</script>
<script type="application/ld+json">
    {
      "@context": "http://schema.org/",
      "@type": "Product",
      "name": "Tratamiento de belleza, ${item.tipo} - ${item.titulo}",
      "description": "${item.descripcion}",
      "brand": {
        "@type": "Thing",
        "name": "In&Out Centro de Belleza - Malaga"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "price": "${item.precio}",
        "priceValidUntil": "2030-12-31"
      }
    }
</script>

`;
    }

    const oldUrls = ['beauty-corner', 'beauty-parties', null, 'contacto', null, 'in-out-go', null, 'quienes-somos'];
    ['beautycorner', 'beautyparties', 'bookings', 'callUs', 'hours', 'inandoutgo', 'photoMeasure', 'team']
        .forEach(function (name, index) {
            const app = es.apps[name];
            const html = template
                .replace('{{body}}', fs.readFileSync(__dirname + `/es/${name}.html`, 'utf8'))
                .replace(/{{title}}/g, getTitle(app.windowTitle))
                .replace(/{{image}}/g, 'https://www.inandoutbelleza.es/assets/images/manzana.png')
                .replace(/{{description}}/g, app.windowDescription);
            const url = `/es/${app.url}`;
            urls.push({ url: url, html: html });
            if (oldUrls[index])
                urls.push({ url: `/${oldUrls[index]}/`, html: html });
            urls.push({ url: `/${oldUrls[index]}`, html: html });
        });


    ['promotions', 'news', 'press'].forEach(function (name) {
        const html = template
            .replace('{{body}}', createHtmlList(name))
            .replace(/{{title}}/g, getTitle(es.apps[name].windowTitle))
            .replace(/{{image}}/g, 'https://www.inandoutbelleza.es/assets/images/manzana.png')
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

        urls.push(...google[name].map(item => {
            const imageUrl = `/google/drive/${es.apps[name].url}/desktop.${item.foto}`;
            const linkUrl = `/es/${es.apps[name].url}/${item.href}`;
            const jsonD = `<script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "NewsArticle",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "${webSiteUrl}${linkUrl}"
              },
              "headline": "${item.titulo}",
              "image": [
                "${webSiteUrl}${imageUrl}"
               ],
              "datePublished": "${getLastmodISO(item.fecha || item.creacion || '01/05/2018')}",
              "dateModified": "${getLastmodISO(item.fecha || item.creacion || '01/05/2018')}",
              "author": {
                "@type": "Organization",
                "name": "In&Out centro de Belleza - Malaga"
              },
               "publisher": {
                "@type": "Organization",
                "name": "In&Out centro de Belleza - Malaga",
                "logo": {
                  "@type": "ImageObject",
                  "url": "${webSiteUrl}/assets/images/manzana.png"
                }
              },
              "description": "${striptags(item.descripcion)}"
            }
        </script>`;

            return {
                url: linkUrl,
                html: template
                    .replace('{{body}}', `
                            <h1>${item.titulo}</h1>
                            <img style="width: 100% !important;" data-src="${imageUrl}" alt="${item.titulo}" title="${item.titulo}"/>
                            <p>${item.descripcion}</p>${jsonD}`)
                    .replace(/{{title}}/g, `${getTitle(es.apps[name].windowTitle)} - ${item.titulo}`)
                    .replace(/{{image}}/g, `${webSiteUrl}${linkUrl}`)
                    .replace(/{{description}}/g, striptags(item.descripcion).substr(0,150))
            };
        }));
    });


    /****************************************************************** BONUS CARDS */
    (function () {
        const html = template
            .replace('{{body}}', createHtmlList('bonusCards'))
            .replace(/{{title}}/g, getTitle(es.apps.bonusCards.windowTitle))
            .replace(/{{image}}/g, 'https://www.inandoutbelleza.es/assets/images/manzana.png')
            .replace(/{{description}}/g, es.apps.bonusCards.windowDescription);
        urls.push({
            url: `/es/${es.apps.bonusCards.url}`,
            html: html
        });
        urls.push(...google.bonusCards.map(item => {
            return {
                url: `/es/${es.apps.bonusCards.url}/${item.href}`,
                html: template
                    .replace('{{body}}', `
                        <h1>${item.titulo}</h1>
                        <img style="width: 100% !important;" data-src="/google/drive/${es.apps.bonusCards.url}/desktop.${item.foto}" alt="${item.titulo}" title="${item.titulo}"/>
                        <p>${item.descripcion}</p>`)
                    .replace(/{{title}}/g, `${getTitle(es.apps.bonusCards.windowTitle)} - ${item.titulo}`)
                    .replace(/{{description}}/g, striptags(item.descripcion).substr(0,150))
            };
        }));
    })();

    /****************************************************************** TREATMENTS */
    (function () {
        google.treatments
            .reduce((a, b) => {
                const type = b.tipo;
                if (b.tipo && a.indexOf(type) === -1) a.push(type);
                return a;
            }, [])
            .forEach(function (type) {
                const trts = google.treatments.filter(i => i.tipo === type);
                const html = template
                    .replace('{{body}}', `<h1>${type}</h1><ul>${trts.map(i => {
                        return `<li><a href="/es/tratamientos/${parseUrlTreatmentType(type)}/${i.href}">${i.titulo}</a></li>`
                    }).join('')}</ul>`)
                    .replace(/{{title}}/g, getTitle(`${es.apps.treatments.windowTitle} - ${type}`))
                    .replace(/{{description}}/g, `${type}: ${trts.map(i => i.titulo).join(', ')}`);
                urls.push({
                    url: `/es/tratamientos/${parseUrlTreatmentType(type)}`,
                    html: html
                });
            });

        const html = template
            .replace('{{body}}', createHtmlList('treatments', item => `/${parseUrlTreatmentType(item.tipo)}`))
            .replace(/{{title}}/g, getTitle(es.apps['treatments'].windowTitle))
            .replace(/{{description}}/g, es.apps['treatments'].windowDescription);
        urls.push({
            url: `/es/${es.apps['treatments'].url}`,
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
        urls.push(...google['treatments'].map(item => {
            const url = `/es/${es.apps['treatments'].url}/${parseUrlTreatmentType(item.tipo)}/${item.href}`;
            return {
                url: url,
                html: template
                    .replace('{{body}}', `
                        <h1>${item.titulo}</h1>
                        <img style="width: 100% !important;" data-src="/google/drive/${es.apps['treatments'].url}/desktop.${item.foto}"/>
                        <p>${item.descripcion}</p>
                        ${createTreatmentSchema(item, url)}
                        `)
                    .replace(/{{title}}/g, `${getTitle(es.apps['treatments'].windowTitle)} - ${item.titulo}`)
                    .replace(/{{description}}/g, striptags(item.descripcion))
            };
        }));
    })();

    /****************************************************************** FOTOS */
    urls.push({
        url: `/es/${es.apps.photos.url}`,
        html: template
            .replace('{{body}}', `<div>LA FOTOS DE IN&OUT</div>
                ${google.photos
                .filter((i) => i.url.indexOf('desktop.') !== -1)
                .map(function ({ name, url }) {
                    return `<img style="width: 100% !important;" data-src="${url}" alt="${name}" title="${name}" />`;
                }).join('')}`)
            .replace(/{{title}}/g, getTitle(es.apps.photos.windowTitle))
            .replace(/{{image}}/g, 'https://www.inandoutbelleza.es/assets/images/manzana.png')
            .replace(/{{description}}/g, es.apps.photos.windowDescription)
    });

    posts
        .filter(p => p.post_type === 'post')
        .filter(p => p.post_name !== '')
        .forEach(function (post) {
            const images = posts
                .filter(p => p.post_parent === post.ID)
                .filter(p => p.post_type === 'attachment');
            urls.push({
                url: `/${post.post_name}`,
                html: template
                    .replace('{{body}}', `
                        <h1>${post.post_title}</h1>
                        <p>${post.post_content}</p>
                        ${images.map(img => `<img data-src="${img.guid}" alt="${img.post_title}" title="${img.post_title}" />`).join('<br/>')}
                        `)
                    .replace(/{{title}}/g, getTitle(post.post_title))
                    .replace(/{{image}}/g, (images[0] || {}).guid)
                    .replace(/{{description}}/g, getTitle(striptags(post.post_excerpt || post.post_content.substr(0, 150))))
            });
        });

    return urls.map(({ url, html }) => {
        return {
            url,
            html: html.replace('{{breadcrumb}}', createBreadcrumb(url))
        };
    });
}

function staticHtml(textFile, google, posts, isSpider) {
    return map(textFile, google, posts, isSpider).reduce((ret, item) => {
        ret[item.url] = item.html;
        return ret;
    }, {});
}

staticHtml.addCss = function (templateFile, isSpider) {
    const template = templateFile.replace('{{isSpider}}', isSpider);
    return isSpider
        ? template.replace('{{style}}', `<style>body {overflow: auto !important;} img {width: auto !important;}
            ${fonts.map(cssStyleFont).join('')}</style>`)
        : template.replace('{{style}}', '<style>#static {display:none;} #boot {display:block;} #welcome {display:block;}</style>');
};

module.exports = staticHtml;
