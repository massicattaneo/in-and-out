const { centers } = require('../../private/new-hours');
const loc = require('../../static/localization/static');

module.exports = function ({ grayColor, greenColor, host, activationCode, footer, name, centerIndex }) {
    return `
    <div style="font-family: Arial; color: ${grayColor}; width: 600px;">
        <p>
        Estimad@ ${name},
        <br/><br/>
	    Hace poco viniste a nuestro centro de ${loc[`location${centerIndex + 1}AddressLabel`]}.<br/><br/>
	    Nos encantaría si tendria un poco de tiempo para dejar tu comentario en Google a este enlace:
        <br/><br/>
        <a style="color:${greenColor}" href="${loc[`location${centerIndex + 1}GoogleReviewUrl`]}">Deja tu Valoración en Google</a>
        </p>
        ${footer}
    </div>`;
};