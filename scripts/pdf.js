const fs = require('fs');
const pdf = require('pdf-parse');

const { getBBVAEntries } = require("../web-app-deploy/get-bbva-entries")

const dataBuffer = fs.readFileSync(`${__dirname}/test.pdf`);
pdf(dataBuffer).then(async data => {
    const [,accountNumber] = data.text.match(/Cuenta: (.*)/)
    const [, month, year] = data.text.match(/Período: (\w*) (\d*)/)
    const string = data.text.split("\n").join(""); 
    const start = string.substring(string.indexOf("BBVAESMMXXX") + 11)
    console.log(getBBVAEntries(start, year))
});
