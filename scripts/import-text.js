const { convertNumber } = require('./common');
const fs = require('fs');
const path = require('path');

const string = fs.readFileSync(path.resolve('web-app-deploy/extras/temp.txt'), 'utf8');
const members = JSON.parse(fs.readFileSync(path.resolve('web-app-deploy/extras/members.json'), 'utf8'));
const wrong = string.split('\n').map(i => i.trim());
fs.writeFileSync(path.resolve('web-app-deploy/extras/wrong.json'), JSON.stringify(wrong), 'utf8');
console.log('finish');
