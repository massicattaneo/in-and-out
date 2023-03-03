module.exports = function({grayColor, html, footer, subject, header, encodedEmail }) {
    return `
    ${header(subject)}
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p style="margin: 0; text-align: justify">${html}</p>
        </td>
    </tr>
    ${footer()}
    `;
};
