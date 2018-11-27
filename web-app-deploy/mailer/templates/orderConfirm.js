const parseCart = require('../../pdf/parseCart');

function toCurrency(number) {
    return `${parseFloat(number).toFixed(2)} €`
}

module.exports = function ({grayColor, id, cart, googleDb, footer, amount, host, header}) {
    return `
    ${header(`Gracias por tu compra!`)}
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p>Aqui tienes el QR te tu orden que puedes mostrar en nuestro centro:</p>
            <p style="width: 100%; text-align: center;">
                <img src="${host}/api/qr-code/${id}" />
            </p>
            <p>
                Aqui puedes descargar el pdf de tu compra:
            </p>
        </td>
    </tr>
    <!-- BULLETPROOF BUTTON -->
    <tr>
        <td bgcolor="#ffffff" align="left">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                        <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="border-radius: 3px;" bgcolor="#56ab2a">
                                    <a href="${host}/api/pdf/${id}" target="_blank" 
                                        style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; 
                                            text-decoration: none; text-decoration: none; padding: 15px 25px; 
                                            border-radius: 2px; border: 1px solid #56ab2a; display: inline-block;">
                                        Descarga el PDF
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p>
                Aqui tienes un resumen de tu pedido:
                <table>                
                ${parseCart(cart, googleDb)
                    .map(item => `
                    <tr>
                        <td width="70%">${item.typeTranslated} - ${item.title}</td>
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
        </td>
    </tr>
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 40px 30px; border-radius: 0px 0px 4px 4px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p style="margin: 0;">Un saludo de tu equipo.</p>
        </td>
    </tr>
    ${footer()}
    `;
};
