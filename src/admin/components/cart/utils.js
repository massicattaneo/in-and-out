import { activePromotions, getPromotionDiscounts, 
    getDiscountsItems, getCartTotal } from '../../../../web-app-deploy/shared';

export const getDiscountedItems = system => {
    return activePromotions(system.publicDb.promotions).map(promo => {
        const dis = getPromotionDiscounts(promo);
        return getDiscountsItems(dis);
    }).reduce((all, item) => all.concat(item), []);
};

export const getCartFullList = (system, discountedItems = []) => {
    const { cartPriority } = system.publicDb;
    const getTreatmentsLabel = bonus => bonus
        .filter((o, i, a) => a.indexOf(o) === i)
        .map(item => ({
            count: bonus.filter(i => i === item).length,
            label: system.publicDb.treatments.find(i => i.identificador === item).titulo
        }))
        .map(item => `${item.count} ${item.label}`)
        .join(',');
        
    return system.publicDb.products
        .map(({ identificador, titulo, cantidad, precio }) => ({
            id: identificador,
            title: titulo,
            quantity: cantidad,
            price: precio,
            type: 'products',
            label: 'PRODUCTO'
        }))
        .concat(system.publicDb.treatments
            .map(({ identificador, titulo, precio, tipo }) => ({
                id: identificador,
                title: `${tipo}: ${titulo}`,
                price: precio,
                quantity: '',
                type: 'treatments',
                label: 'TRATAMIENTO'
            })))
        .concat(system.publicDb.bonusCards
            .map(({ identificador, titulo, precio, treatments, credit }) => {
                const des = credit ? credit : getTreatmentsLabel(treatments);
                return {
                    id: identificador,
                    title: `${titulo} (${des})`,
                    price: precio,
                    quantity: '',
                    type: 'bonusCards',
                    label: 'BONO'
                };
            }))
        .filter(item => item.price)
        .sort((first, second) => {
            if (discountedItems.find(id => first.id === id) && !discountedItems.find(id => second.id === id)) return -1;
            if (!discountedItems.find(id => first.id === id) && discountedItems.find(id => second.id === id)) return 1;
            if (cartPriority.includes(first.id) || cartPriority.includes(second.id)) {
                const ff = cartPriority.includes(first.id);
                const ss = cartPriority.includes(second.id);
                if (ff && ss) return cartPriority.indexOf(second.id) - cartPriority.indexOf(first.id);
                if (ff) return -1;
                if (ss) return 1;
            }
            return first.title.localeCompare(second.title);
        });
};

export const getId = carts => {
    let id = 1;
    while (carts.filter(item => item.id === id).length > 0) {
        id++
    }
    return id;
}

export const getFormattedTotal = (system, discountedItems, id, excludePromos = false) => {
    const db = Object.assign({}, system.publicDb, { promotions: [] });
    const sum = getCartTotal(excludePromos ? db : system.publicDb, [id]);
    if (discountedItems.includes(id)) return `
    <span style="text-decoration: line-through; font-size: 9px;">${system.toCurrency(sum.real)}</span>
    <br/>
    <span>${system.toCurrency(sum.total)}</span>`;
    return system.toCurrency(sum.total);
};

export const getColor = prod => {
    if (prod.type === 'treatments') return '#ffffdd70';
    if (prod.type === 'bonusCards') return '#ffddff70';
    if (prod.type === 'products') return '#ddffff70';
}