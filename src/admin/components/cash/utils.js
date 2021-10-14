export const fillSelectWithClients = (htmlElement, system, selectedClientId = '') => {
    htmlElement.innerHTML = `<option ${selectedClientId === '' ? 'selected' : ''} value="">SIN CONTACTO</option>` + system.store.clients
        .sort((a, b) => a.surname.localeCompare(b.surname))
        .map(function (c) {
            return `<option ${selectedClientId === c._id ? 'selected' : ''} value="${c._id}">${c.surname} ${c.name}</option>`;
        }).join('');
};