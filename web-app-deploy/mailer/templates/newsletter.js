module.exports = function({grayColor, html, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}; width: 600px;">
        <p style="text-align: justify">${html}</p>
        ${footer}
    </div>`
};