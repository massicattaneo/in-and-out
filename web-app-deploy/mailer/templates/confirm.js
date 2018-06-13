const { confirmRegistrationUrl } = require('../../serverInfo');

module.exports = function({grayColor, name, greenColor, host, activationCode, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}; width: 600px;">
        <h1>Bienvenid@ ${name}!</h1>
        <p>
            Por favor haz
            <a style="color:${greenColor}" href="${host}${confirmRegistrationUrl}?activationCode=${activationCode}">
            click aqui
            </a>
            para confirmar la creación de tu cuenta.
        </p>
        <p>
            Un saludo de tu nuevo equipo.
        </p>
        ${footer}
    </div>
                `
}