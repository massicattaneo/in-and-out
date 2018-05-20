module.exports = function({grayColor, name, greenColor, host, activationCode, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <h1>Hola ${name}!</h1>
        <p>
            Por favor haz
            <a style="color:${greenColor}" href="${host}/es/cuenta/reiniciar?activationCode=${activationCode}">
            click aqui
            </a>
            para poner tu contraseña.
        </p>
        <p>
            Un saludo de tu equipo.
        </p>
        ${footer}
    </div>
                `
}