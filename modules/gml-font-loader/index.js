function waitFont(fontFamily, callback) {
    var tester = document.createElement('span');
    var testFont = 'Comic Sans MS';
    var maxMs = 1000;
    tester.style.position = 'absolute';
    tester.style.top = '-9999px';
    tester.style.left = '-9999px';
    tester.style.visibility = 'hidden';
    tester.style.fontFamily = testFont;
    tester.style.fontSize = '250px';
    tester.innerHTML = 'QW@HhsXJ';
    document.body.appendChild(tester);
    var startWidth = tester.offsetWidth;
    tester.style.fontFamily = fontFamily + ', ' + testFont;
    var start = new Date().getTime();

    function checkFont() {
        var loadedFontWidth = tester.offsetWidth;
        if (startWidth === loadedFontWidth && (new Date().getTime() - start) < maxMs) {
            setTimeout(checkFont, 100);
        }
        else {
            callback()
        }
    }
    checkFont();
};

function addStyle(name, url) {
    var s = document.createElement('style');
    s.type = "text/css";
    document.getElementsByTagName('head')[0].appendChild(s);
    const css = `@font-face {
          font-family: ${name};
          src: url("${url.replace('{{ext}}', 'eot')}");
          src: url("${url.replace('{{ext}}', 'eot')}#iefix") 
          format("embedded-opentype"), url("${url.replace('{{ext}}', 'woff2')}") 
          format("woff2"), url("${url.replace('{{ext}}', 'woff2')}") 
          format("woff"), url("${url.replace('{{ext}}', 'ttf')}") 
          format("truetype"), url("${url.replace('{{ext}}', 'svg')}#webfont") format("svg");
          font-weight: normal;
          font-style: normal; }`;
    if (s.styleSheet){
        s.styleSheet.cssText = css;
    } else {
        s.appendChild(document.createTextNode(css));
    }
}
export default function () {
    return {
        load: ({ resources, Progress }) => {
            const totSize = resources.map(it => it.size).reduce((itA, itB) => itA + itB);
            const progress = Progress(totSize, resources.map((it) => {
                return { size: it.size };
            }));
            progress.startSimulate();
            return Promise.all(resources.map((resource) => {
                return new Promise(function (resolve) {
                    const name = resource.url.substr(resource.url.lastIndexOf('/') +1, resource.url.lastIndexOf('.') - resource.url.lastIndexOf('/') -1);
                    const url = resource.url.replace('.ttf', '.{{ext}}');
                    addStyle(resource.name || name, url);
                    return waitFont(resource.name || name, function () {
                        resource.name = resource.name || name;
                        resolve(resource)
                    })
                });
            }));


        }
    }
}
