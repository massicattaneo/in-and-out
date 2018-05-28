const cartEs = require('../static/localization/cart/es.json');
module.exports = function parseCart(array, googleDb) {
    const stored = {
        'TRT': 'treatments',
        'TAR': 'bonusCards',
        'PRD': 'products'
    };
    return array
        .reduce((arr, { id }) => {
            const filter = arr.filter(i => i.id === id);
            if (filter.length) {
                filter[0].count++;
            } else {
                const type = stored[id.substr(0, 3)];
                const t = googleDb[type].filter(i => i.identificador == id)[0];
                arr.push({
                    id,
                    count: 1,
                    title: t.titulo,
                    price: t.precio,
                    type,
                    typeTranslated: cartEs.treatmentsTypes[type],
                    category: type === 'treatments' ? `${t.tipo}` : type === 'bonusCards' ? 'Tarjeta' : ''
                });
            }
            return arr;
        }, []);
};