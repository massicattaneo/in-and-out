const newHours = require("./private/new-hours");

const getUser = what => {
    const [user = null] = newHours.centers
        .filter(center => what.includes(center.bbvaRef))
        .map(cent => cent.id);
    return user
};

const formatDate = date => {
    const formatted = new Date(date.split("/").reverse().join("-"));
    formatted.setHours(7, 0, 0, 0);
    return formatted;
};

const formatEntry = ({ amount, date, type, user }) => {
    const formattedDate = formatDate(date);
    if (type === "bank-card") {
        if (formattedDate.getDay() === 1) {
            formattedDate.setTime(formattedDate.getTime() - 3 * ONE_DAY)
        } else {
            formattedDate.setTime(formattedDate.getTime() - 1 * ONE_DAY)
        }
    }
    return {
        type,
        amount: Number(amount.replace(".", "").replace(",", ".")),
        date: formattedDate.getTime(),
        user,
    };
};


const getCardDeposit = (start, year) => {
    let list = start;
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EURLIQUID.LIQUIDA REMESAS COMERCICOMERC ([^/]*)([^/]*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    const cashEntries = [];
    while (list.match(regExp)) {
        const [toReplace, amount, , what, , , date] = list.match(regExp);
        cashEntries.push(formatEntry({
            amount: amount.replace(year, ""),
            date,
            type: "pos-deposit",
            user: getUser(what),
        }));
        list = list.replace(toReplace, "");
    }
    return cashEntries
};

const getCashDeposit = (start, year) => {
    let list = start;
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EURINGRESO EN EFECTIVO([^/]*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    const cashEntries = [];
    while (list.match(regExp)) {
        const [toReplace, amount, , , , date] = list.match(regExp);
        cashEntries.push(formatEntry({
            amount: amount.replace(year, ""),
            date,
            type: "cash-deposit",
            user: null
        }));
        list = list.replace(toReplace, "");
    }
    return cashEntries
};

const getStripeDeposit = (start, year) => {
    let list = start;
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EURORDEN PA RECIBIDA EN EUROS([^/]*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    const cashEntries = [];
    while (list.match(regExp)) {
        const [toReplace, amount, , , , date] = list.match(regExp);
        cashEntries.push(formatEntry({
            amount: amount.replace(year, ""),
            date,
            type: "stripe-deposit",
            user: "online"
        }));
        list = list.replace(toReplace, "");
    }
    return cashEntries
};

const getSocialSecurity = (start, year) => {
    let list = start;
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EURCUOTAS DE SEGURIDAD SOCIAL([^/]*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    const cashEntries = [];
    while (list.match(regExp)) {
        const [toReplace, amount, , , date] = list.match(regExp);
        cashEntries.push(formatEntry({
            amount: amount.replace(year, ""),
            date,
            type: "social-security-payment",
            user: null
        }));
        list = list.replace(toReplace, "");
    }
    return cashEntries
};

const getSalaries = (start, year) => {
    let list = start;
    const regExp = /(-?[\d\.,]*) EUR-?([\d\.,]*) EURTRANSFERENCIASN[oó]MINA([^/]*)(\d\d\/\d\d\/\d\d\d\d)(\d\d\/\d\d\/\d\d\d\d)/;
    const cashEntries = [];
    while (list.match(regExp)) {
        const [toReplace, amount, , , , date] = list.match(regExp);
        cashEntries.push(formatEntry({
            amount: amount.replace(year, ""),
            date,
            type: "salary-payment",
            user: null
        }));
        list = list.replace(toReplace, "");
    }
    return cashEntries
};

const getBBVAEntries = (start, year) => {
    return [
        ...getCardDeposit(start, year), 
        ...getCashDeposit(start, year),
        ...getStripeDeposit(start, year),
        ...getSalaries(start, year),
        ...getSocialSecurity(start, year)
    ]
}

module.exports = { getBBVAEntries }