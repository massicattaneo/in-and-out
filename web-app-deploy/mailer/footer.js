const { host, greenColor, email } = require('../serverInfo');
module.exports = function () {
    return `
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </td>
    </tr>
    <!-- LINKS -->
    <tr>
        <td bgcolor="#f4f4f4" align="center" style="padding: 30px 10px 0px 10px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                    <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; text-align: center" >
                <tr>
                    <td bgcolor="#f4f4f4" align="left" style="padding: 30px 30px 30px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
                        <p style="margin: 0;">
                            <a href="${host}/es/cuenta" target="_blank" style="color: #111111; font-weight: 700;">Entra</a> -
                            <a href="${host}/es/promociones" target="_blank" style="color: #111111; font-weight: 700;">Promociones</a> -
                            <a href="${host}/es/tratamientos" target="_blank" style="color: #111111; font-weight: 700;">Tratamientos</a>
                        </p>
                    </td>
                </tr>
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </td>
    </tr>
    <!-- SUPPORT CALLOUT -->
    <tr>
        <td bgcolor="#f4f4f4" align="center" style="padding: 30px 10px 0px 10px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                    <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
                <!-- HEADLINE -->
                <tr>
                    <td bgcolor="#FFECD1" align="center" style="padding: 30px 30px 30px 30px; border-radius: 4px 4px 4px 4px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
                        <h2 style="font-size: 20px; font-weight: 400; color: #111111; margin: 0;">Necessitas ayuda?</h2>
                        <p style="margin: 0;"><a href="https://www.inandoutbelleza.es/es/llamanos" target="_blank" style="color: #56ab2a;">Llamanos</a></p>
                    </td>
                </tr>
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </td>
    </tr>
    <!-- FOOTER -->
    <tr>
        <td bgcolor="#f4f4f4" align="center" style="padding: 0px 10px 0px 10px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                    <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
                <!-- PERMISSION REMINDER -->
                <tr>
                    <td bgcolor="#f4f4f4" align="left" style="padding: 30px 30px 30px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
                        <p style="margin: 0;">Si quieres leer nuestra Politica de Privacidad haz click
                            <a href="https://www.inandoutbelleza.es/es/preguntas" target="_blank" style="color: ${greenColor}; font-weight: 700;">aqui</a></p>
                    </td>
                </tr>
                <!-- UNSUBSCRIBE 
                <tr>
                    <td bgcolor="#f4f4f4" align="left" style="padding: 0px 30px 30px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
                        <p style="margin: 0;">If these emails get annoying, please feel free to <a href="https://www.inandoutbelleza.es/unsubscribe"
                                                                                                   target="_blank" style="color: ${greenColor}; font-weight: 700;">unsubscribe</a>.</p>
                    </td>
                </tr>
                -->
                
                <!-- LOGO -->
                <tr>
                    <td bgcolor="#f4f4f4" align="left" style="padding: 0px 30px 30px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
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
                        <span style="font-size: 11px; color: #888">Málaga - Calle Puerta de Buenaventura, 4 Tel: 951 387 919 | Móvil: 695 685 291</span>
                    </td>
                </tr>
                <!-- PRIVACY -->
                <tr>
                    <td bgcolor="#f4f4f4" align="left" style="padding: 0px 30px 30px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 8px; font-weight: 400; " >
                        Este mensaje y sus archivos adjuntos son confidenciales y únicamente podrán ser usados 
                        por la persona o entidad a la que van dirigidos. Este mensaje puede contener 
                        información confidencial o legalmente protegida. No hay renuncia a la confidencialidad o 
                        secreto profesional por cualquier transmisión defectuosa o errónea. 
                        Si usted ha recibido este mensaje por error notifíqueselo inmediatamente al remitente.
                        Le informamos que sus datos personales son tratados por HIDIME BELLEZA SL con la 
                        finalidad de gestionar y mantener las relaciones profesionales que nos unen con Usted. 
                        Sus datos podrán ser cedidos a las entidades y administraciones públicas necesarias 
                        para la realización de dicha gestión. Este tratamiento de datos es necesario para
                         mantener dicha relación profesional. Los datos se eliminarán cuando finalicen los 
                         plazos de prescripción marcados por la ley, conservándose únicamente para atender 
                         posibles reclamaciones. Ud. puede ejercer sus derechos de acceso, rectificación, 
                         cancelación, oposición, portabilidad y limitación del tratamiento de sus datos dirigiéndose a 
                         HIDIME BELLEZA, C/  Salitre nº 11, Bajo, C.P. 29.002 Málaga (Málaga) o a 
                         <a style="color: ${greenColor};" href="mailto:${email}">${email}</a>, acompañando copia de su DNI acreditando debidamente su identidad. 
                         En cualquier situación, Ud. tiene derecho a presentar una reclamación ante la 
                         Agencia Española de Protección de Datos (AEPD)
                    </td>
                </tr>
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </td>
    </tr>
</table>

</body>
</html>
`;
};
