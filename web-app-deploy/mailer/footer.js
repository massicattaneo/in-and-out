const { host, greenColor } = require('../serverInfo');
module.exports = `
    <br/><br/>
    <hr/>
    <table cellpadding="2" cellspacing="0" width="600px" style="width: 600px;text-align: center;">
        <tr>
            <td><a style="color:${greenColor}" href="${host}/es/cuenta/entrar">ENTRA</a></td>
            <td><a style="color:${greenColor}" href="${host}/es/promociones">PROMOCIONES</a></td>
            <td><a style="color:${greenColor}" href="${host}/es/novedades">NOVEDADES</a></td>
            <td><a style="color:${greenColor}" href="${host}/es/tratamientos">TRATAMIENTOS</a></td>
        </tr>
    </table>
    <hr/>
    <br/>
    <table cellpadding="0" cellspacing="0">
        <tr>
            <td rowspan="2">
                <img width="50px" src="${host}/assets/images/manzana.png"/>
            </td>
            <td>&nbsp;</td>
            <td style="font-size:40px; font-weight: bold; line-height: 40px;">
                In<span style="color:${greenColor}">&</span>Out
            </td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>centro de belleza</td>
        </tr>
    </table>
    <span style="font-size: 11px; color: #888">Málaga - Calle Salitre, 11 Tel: 951 131 460 | Móvil: 633 90 91 03</span><br/>
    <span style="font-size: 11px; color: #888">Málaga - Calle puerta de Buenaventura, 4, 11 Tel: 951 387 919 | Móvil: 695 685 291</span>
`;