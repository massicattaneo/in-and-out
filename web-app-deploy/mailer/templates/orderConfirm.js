const parseCart = require('../../pdf/parseCart');

function toCurrency(number) {
    return `${parseFloat(number).toFixed(2)} €`
}

module.exports = function ({grayColor, id, cart, googleDb, footer, amount, host}) {
    return `
    <p style="font-family: Arial; color: ${grayColor}">
        <h1>Hola!</h1>
        <p>
            Aqui tienes el QR te tu orden que puedes mostrar en nuestro centro:<br/>
            <img src="${host}/api/qr-code/${id}" />
        </p>
        <p>
            Aqui puedes descargar el pdf de tu compra:<br/>
            <a href="${host}/api/pdf/${id}">DESCARGA EL PDF</a>
        </p>
        <p>
            Aqui tienes un resumen de tu pedido:
            <table>                
            ${parseCart(cart, googleDb)
                .map(item => `
                    <tr>
                        <td width="70%">${item.title}</td>
                        <td  width="30%" style="text-align: right;">
                            ${toCurrency(Number(item.price) * item.count)}
                        </td>
                    </tr>
                    `).join('')}
                <tr><td colspan="2"><hr/></td></tr>
                <tr>
                    <td style="text-align: right">TOTAL PAGADO:</td>
                    <td style="text-align: right">
                        ${toCurrency(amount/100)}
                    </td>
                </tr>
            </table>
        </p>
        <p>
            Un saludo de tu equipo.
        </p>
        ${footer}
    </div>
                `
};