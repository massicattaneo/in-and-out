const fs = require('fs');
const pdf = require('pdf-parse');

const { getBBVAEntries } = require("../web-app-deploy/get-bbva-entries")

const dataBuffer = fs.readFileSync(`${__dirname}/test.pdf`);
pdf(dataBuffer).then(async data => {
    const [,accountNumber] = data.text.match(/Cuenta: (.*)/)
    const [, month, year] = data.text.match(/Período: (\w*) (\d*)/)
    const string = data.text.split("\n").join(""); 
    const start = string.substring(string.indexOf("BBVAESMMXXX") + 11)
    console.log(getBBVAEntries(start, year).length)
    // const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EUR(.*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    // let list = "-185,94 EUR20.089,22 EURPA CON TARJETA EN/ RESTAURANTES5529310007586849 AMZN Mktp ES*1L40N0LN424/02/202327/02/2023-89,00 EUR20.275,16 EURPA CON TARJETA EN MODA.CALZADO5529310007586849 PRIMARK LARIOS CENTRO24/02/202327/02/2023457,46 EUR20.364,16 EURORDEN PA RECIBIDA EN EUROSLIQ. OP. N    00044045669000127/02/202327/02/2023"
    
    // const getLine = (str) => {
    //     let length = 1
    //     let part = str.substring(0, length)
    //     while (!part.match(/\d\d\/\d\d\/\d\d\d\d\d\d\/\d\d\/\d\d\d\d$/) && length <= str.length) {
    //         part = str.substring(0, ++length)
    //     }
    //     return part
    // }

    // while (getLine(list)) {
    //     const line = getLine(list)
    //     console.log(line)
    //     const [, amount, , , , date] = line.match(regExp);
    //     list = list.replace(line, "");
    // }
});
