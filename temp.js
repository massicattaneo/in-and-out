const fs = require('fs');

fs.readdirSync(`${__dirname}/temp`).forEach(file => {
    if (!file.endsWith('.jpg')) return;
    const destination = file.replace(/_/g, '-').toLowerCase();
    const original = fs.readFileSync(`${__dirname}/temp/${file}`);
    fs.unlinkSync(`${__dirname}/temp/${file}`);
    fs.writeFileSync(`${__dirname}/temp/${destination}`, original);
});
