module.exports = function ({ grayColor, name, greenColor, host, activationCode, footer, header }) {
    return `
    ${header(`Hola ${name}!`)}
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p style="margin: 0;">Por favor haz click en este boton para poner tu contraseña.</p>
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
                                    <a href="${host}/es/cuenta/reiniciar?activationCode=${activationCode}" target="_blank" 
                                        style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; 
                                            text-decoration: none; text-decoration: none; padding: 15px 25px; 
                                            border-radius: 2px; border: 1px solid #56ab2a; display: inline-block;">
                                        Crea contraseña
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
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
