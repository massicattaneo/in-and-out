module.exports = function ({ password, footer, header, adminUser }) {
  return `
    ${header(`Accesso a In&Out`)}
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p style="margin: 0;">Hola,</p>
            <p style="margin: 16px 0 0 0;">"<strong>${
              adminUser.name
            }</strong>" ha pendido acesso a IN&OUT.</p>
            <p style="margin: 16px 0 0 0;">Tendrà acesso a las siguientes informaciones:</p>
            <ul>
                ${adminUser.permissions.centers.map(center => `<li>${center}</li>`).join("")}
            </ul>
            <p style="margin: 0;">Codigo de acceso:</p>
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
                                    <div 
                                        style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; 
                                            text-decoration: none; text-decoration: none; padding: 15px 25px; 
                                            border-radius: 2px; border: 1px solid #56ab2a; display: inline-block;">
                                        ${password}
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    ${footer()}
    `
}
