const firebase = require('./private/firebase.json');
const centers = {
    salitre: 'salitre',
    compania: 'compania'
};


async function firebaseClients(mongo) {
    const clientKeys = Object.keys(firebase.clients);
    const cards = Object.keys(firebase.cards)
        .map(id => Object.assign({ id }, firebase.cards[id]));

    for (let key in clientKeys) {
        const client = firebase.clients[clientKeys[key]];
        await mongo.rest.insert('users', {
            fb_id: clientKeys[key],
            fb_cardId: cards.find(c => c.clientId === clientKeys[key]) ? cards.find(c => c.clientId === clientKeys[key]).id : '',
            name: client.name,
            surname: client.surname,
            user: centers[client.user],
            tel: client.tel,
            email: client.email,
            created: client.modified
        });
    }
}

// async function firebaseCards() {
//     const keys = Object.keys(firebase.cards);
//     const users = await mongo.getAll('users');
//     for (let key in keys) {
//         const item = firebase.cards[keys[key]];
//         await mongo.rest.insert('cards', {
//             fb_id: keys[key],
//             name: item.name,
//             centerId: centers[item.user],
//             created: item.created,
//             clientId: users.find(u => u.fb_id === item.clientId)._id
//         });
//     }
// }

async function firebaseTransactions(mongo) {
    const transactions = Object.keys(firebase.transactions)
        .map(id => Object.assign({ id }, firebase.transactions[id]))
        .sort((a, b) => a.created - b.created);
    const users = await mongo.getAll('users');
    const ts = transactions
        .filter(t => t.type !== 'utilizo bonus')
        .map(t => Object.assign({}, t, { id: undefined, fb_id: t.id }))

    for (let index in ts) {
        const item = ts[index];
        const date = new Date(item.created);
        date.setHours(13, 0, 0, 0);
        //sin contactos
        //-Ko7NjALDw2rdlK-BvV9
        const clientId = item.clientId && users.find(u => u.fb_id === item.clientId) ? users.find(u => u.fb_id === item.clientId)._id : '';
        await mongo.rest.insert('cash', {
            clientId: clientId,
            date: date.getTime(),
            description: item.description,
            fb_id: item.fb_id,
            name: item.name,
            type: item.type === 'efectivo' ? 'efectivo' : 'tarjeta',
            user: centers[item.user],
            amount: item.value
        });
    }
}

async function firebaseBonuses(mongo) {
    const transactions = Object.keys(firebase.transactions)
        .map(id => Object.assign({ id }, firebase.transactions[id]))
        .sort((a, b) => a.created - b.created);
    const cards = Object.keys(firebase.cards)
        .map(id => Object.assign({ id }, firebase.cards[id]));

    const ts = cards.map(function(card) {
        let referenceKey;
        card.bonuses = transactions
            .filter(t => t.cardId === card.id)
            .reduce((bonusesObject, item, index, array) => {
                const key = item.id;
                if (item.value >= 0) {
                    referenceKey = item.transactionId || key;
                    bonusesObject[key] = bonusesObject[key] || {};
                    bonusesObject[referenceKey][key] = item;
                } else {
                    bonusesObject[(item.transactionId || referenceKey)][key] = item;
                }
                return bonusesObject;
            }, {});
        card.bonuses = Object.keys(card.bonuses).map(function(bonusKey) {
            const el = card.bonuses[bonusKey];
            const ret = {};
            ret.bonusPayTransaction = bonusKey;
            ret.credit = el[bonusKey] ? el[bonusKey].value : 0;
            ret.payed = el[bonusKey] ? el[bonusKey].value : 0;
            ret.transactions = Object.keys(el).map(k => el[k]);
            ret.treatments = [];
            ret.remainig = ret.transactions.reduce((tot, i) => tot + i.value, 0);
            ret.cardId = card.id;
            ret.clientId = card.clientId;
            ret.title = ret.transactions.find(t => t.id === ret.bonusPayTransaction)
                ? ret.transactions.find(t => t.id === ret.bonusPayTransaction).description
                    .replace('COMPRA BONO DE', '').replace('COMPRA BONO', '').replace('COMPRA', '').replace('BONO', '').trim()
                : card.name;
            ret.created = ret.transactions[0] ? ret.transactions[0].created : card.created;
            return ret;
        });
        card.bonuses = card.bonuses.filter(b => b.transactions.length);
        card.bonuses.forEach(function(ret) {
            ret.remainig = Math.round(ret.remainig) <= 0 ? 0 : Number(ret.remainig.toFixed(3));
            ret.finished = ret.remainig <= 0;
            if (ret.transactions.find(t => t.id === ret.bonusPayTransaction)) {
                const item = ret.transactions.find(t => t.id === ret.bonusPayTransaction);
                ret.transactions.splice(ret.transactions.indexOf(item), 1)
            }
            ret.transactions = ret.transactions.map(t => {
                return {
                    amount: Number(t.value.toFixed(2)),
                    created: t.created
                }
            })
        });
        return card;
    }).reduce((arr, item) => arr.concat(item.bonuses), []);

    const users = await mongo.getAll('users');

    for (let index in ts) {
        const item = ts[index];
        const date = new Date(item.created);
        date.setHours(13, 0, 0, 0);
        await mongo.rest.insert('bonus', {
            transactionId: item.bonusPayTransaction,
            clientId: users.find(u => u.fb_id === item.clientId)._id,
            created: item.created,
            credit: item.credit,
            finished: item.finished,
            title: item.title,
            transactions: item.transactions,
            treatments: item.treatments
        });
    }

}

module.exports = { firebaseBonuses, firebaseTransactions, firebaseClients };