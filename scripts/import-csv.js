const {convertNumber} = require('./common');
const fs = require('fs');
const path = require('path');

module.exports = function (db) {
    /** import bank csv */
    const docs = [];

    // const lines = fs.readFileSync(path.resolve(__dirname, './Hidime.csv'), 'utf8');
    // docs.push(...lines.split('\n').map(function (line) {
    //     let arr = line.match(/(\d\d-\d\d-\d\d\d\d)\s+(\d\d\d\d\d)\s([^\d]*)\s+(\d\d-\d\d-\d\d\d\d)\s+(-?\d+.?\d+,?\d+)\s+(-?\d+.?\d+,?\d+)(.*)/);
    //     if (!arr) return;
    //     arr.splice(0,1);
    //     return {
    //         accountingDate: new Date(arr[0].split('-').reverse().join('-')),
    //         key: arr[1].substr(2),
    //         description: arr[2],
    //         note: arr[6].replace('\t', '').replace(/\s+/, '').trim(),
    //         valueDate: new Date(arr[3].split('-').reverse().join('-')),
    //         amount: convertNumber(arr[4]),
    //          office: '4101',
    //         account: 'main'
    //     }
    // }).filter(i => i));
    //
    // docs.splice(1,1);
    //
    const lines1 = fs.readFileSync(path.resolve(__dirname, './main.csv'), 'utf8');
    docs.push(...lines1
        .split('\n')
        .filter(line => line.match(/^\d\d\/\d\d\/\d\d\d\d/))
        .map(function (line) {
            const arr = line.split('\t');
            return {
                accountingDate: new Date(arr[0].split('/').reverse().join('-')),
                key: arr[2],
                description: arr[3],
                note: arr[4].replace('\t', '').replace(/\s+/, '').trim().replace(/'/g, ''),
                valueDate: new Date(arr[1].split('/').reverse().join('-')),
                amount: convertNumber(arr[6]),
                office: arr[5].replace(/'/g, ''),
                account: 'main'
            };
        }));

    const lines2 = fs.readFileSync(path.resolve(__dirname, './secondary.csv'), 'utf8');
    docs.push(...lines2
        .split('\n')
        .filter(line => line.match(/^\d\d\/\d\d\/\d\d\d\d/))
        .map(function (line) {
            const arr = line.split('\t');
            return {
                accountingDate: new Date(arr[0].split('/').reverse().join('-')),
                key: arr[2],
                description: arr[3],
                note: arr[4].replace('\t', '').replace(/\s+/, '').trim().replace(/'/g, ''),
                valueDate: new Date(arr[1].split('/').reverse().join('-')),
                amount: convertNumber(arr[6]),
                office: arr[5].replace(/'/g, ''),
                account: 'iva'
            }
        }));

    // console.log(docs[docs.length-1])

    db.collection('bank').insert(docs);
};
