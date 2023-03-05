const newHours = require("./private/new-hours");
const ONE_DAY = 24 * 60 * 60 * 1000
const getUser = what => {
    const [user = null] = newHours.centers
        .filter(center => what.includes(center.bbvaRef))
        .map(cent => cent.id);
    return user
};

const formatDate = date => {
    const formatted = new Date(date.split("/").reverse().join("-"));
    formatted.setHours(7, 0, 0, 0);
    return formatted.getTime();
};

const getLine = (str) => {
    let length = 1
    let part = str.substring(0, length)
    while (!part.match(/\d\d\/\d\d\/\d\d\d\d\d\d\/\d\d\/\d\d\d\d$/) && length <= str.length) {
        part = str.substring(0, ++length)
    }
    return part
}

const getBBVAEntries = (start, year) => {
    let list = start
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EUR(.*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)$/;
    const cashEntries = []

    while (getLine(list)) {
        const line = getLine(list)
        const [, num, ,description, , strDate] = line.match(regExp);
        const amount = Number(num.replace(".", "").replace(",", "."))
        const date = formatDate(strDate)
        if (description.match(/LIQUID.LIQUIDA REMESAS COMERCICOMERC (.*)/)) {
            const newDate = new Date(date)
            newDate.setTime(newDate.getTime() - (newDate.getDay() === 1 ? 3 : 1) * ONE_DAY)
            cashEntries.push({
                amount,
                description,
                date: newDate.getTime(),
                type: "pos-deposit",
                user: getUser(description),
            });
        } else if (description.match(/IMPUESTOS(.*)/i)) {
            cashEntries.push({ amount , description, date, type: "tax-payment", user: null });
        } else if (description.match(/TRIBUTOS(.*)/i)) {
            cashEntries.push({ amount , description, date, type: "tax-payment", user: null });
        } else if (description.match(/INGRESO EN EFECTIVO(.*)/i)) {
            cashEntries.push({ amount , description, date, type: "cash-deposit", user: null });
        } else if (description.match(/ORDEN PA RECIBIDA EN EUROS(.*)/i)) {
            cashEntries.push({ amount, description, date, type: "stripe-deposit", user: "online" });
        } else if (description.match(/CUOTAS DE SEGURIDAD SOCIAL(.*)/i)) {
            cashEntries.push({ amount, description, date, type: "social-security-payment", user: null });
        } else if (description.match(/TRANSFERENCIAS\s?N[oó]MINA(.*)/i)) {
            const newDate = new Date(date)
            if (newDate.getDate() >= 1 && newDate.getDate() < 15) {
                // PREVIOUS MONTH
                newDate.setDate(1)
                newDate.setHours(0,0,0,0)
                newDate.setTime(newDate.getTime() - 8 * 60 * 60 * 1000)
                
            }
            cashEntries.push({ amount, description, date: newDate.getTime(), type: "salary-payment", user: null });
        } else if (description.match(/TRANSFERENCIAS(.*)/i)) {
            cashEntries.push({ amount, description, date, type: "wire-payment", user: null });
        } else if (description.match(/PA CON TARJETA(.*)/i)) {
            cashEntries.push({ amount, description, date, type: "credit-card-payment", user: null });
        } else if (description.match(/ADEUDO POR DOMICILIAC\s?N[oó]MINA(.*)/i)) {
            cashEntries.push({ amount, description, date, type: "direct-bank-payment", user: null });
        } else if (amount > 0) {
            cashEntries.push({ amount, description, date, type: "generic-deposit", user: null });
        } else {
            cashEntries.push({ amount, description, date, type: "generic-payment", user: null });
        }
        list = list.replace(line, "");
    }


    return cashEntries
}

module.exports = { getBBVAEntries }