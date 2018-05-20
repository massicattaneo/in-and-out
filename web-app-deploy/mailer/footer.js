const { host, greenColor } = require('../serverInfo');
module.exports = `
    <br/><hr/><br/>
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
`;