const pdfreader = require('pdfreader');
const path = require('path');
const fs = require('fs');

let wasAdded = false;
const items = [];
new pdfreader.PdfReader().parseFileItems(path.resolve(__dirname, './Hidime.pdf'), function (err, item) {
    if (err) return console.log(err)
    if (!item) return console.log('errore')
    else if (item.text) {
        item.text.split('\n').forEach(function (line) {
            if (wasAdded) {
                items[items.length-1] += '\t' + line;
                wasAdded = false;
            }
            if (line.length > 10 && line.match(/\d\d-\d\d-\d\d\d\d/)) {
                items.push(line.replace(/\s+/, '\t'));
                wasAdded = true;
            }
        });
        fs.writeFileSync(path.resolve(__dirname, './Hidime.csv'),items.join('\n'))
    }
});
