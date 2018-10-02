const posts = require('../web-app-deploy/extras/posts.json');
const utils = {};
const goog = require('../web-app-deploy/google-api')(utils, posts);
const google = require('googleapis');
const drive = google.drive('v2');
const fs = require('fs');

(async function () {
    await goog.authorize();
    const uploadsId = '1uJnTZTgbxePRiS2l0alsfcMlx9it0RWS';
    // drive.files.list({} , function (e, d) {
    //     console.log(d.items[3])
    // })

    drive.files.insert({
        ocr: true,
        resource: {
            title: 'test.png',
            parents: [{id: uploadsId}]
        },
        media: {
            body: fs.readFileSync('./src/assets/images/factura mantenimiento equipo Vela.pdf'),
        }
    }, function (err, file) {
        console.log(file)
        // drive.permissions.insert({
        //     fileId: file.id,
        //     resource: {
        //         "role": "writer",
        //         "type": "user",
        //         "value": "info@inandoutbelleza.com"
        //     }
        // }, function (e, d) {
        //     console.log(e)
        // });
    });

})();