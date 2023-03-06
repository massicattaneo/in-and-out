const { confirmRegistrationUrl } = require('../../serverInfo');

module.exports = function ({ grayColor, name, greenColor, host, activationCode, footer, header, event, encodedEmail }) {
    return `
    ${header(`Gracias ${event.clientName}!`)}
    <!-- COPY -->
    <tr>
        <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Arial', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
            <p style="margin: 0;">
                <div itemscope itemtype="http://schema.org/EventReservation">
                  <meta itemprop="reservationNumber" content="${event.bookId}"/>
                  <link itemprop="reservationStatus" href="http://schema.org/Confirmed"/>
                  <div itemprop="underName" itemscope itemtype="http://schema.org/Person">
                    <meta itemprop="name" content="${event.clientName}"/>
                  </div>
                  <div itemprop="reservationFor" itemscope itemtype="http://schema.org/Event">
                    <meta itemprop="name" content="${event.description}"/>
                    <meta itemprop="startDate" content="${event.startDate}"/>
                    <meta itemprop="endDate" content="${event.endDate}"/>
                    <div itemprop="location" itemscope itemtype="http://schema.org/Place">
                      <meta itemprop="name" content="In&Out - Centro de belleza"/>
                      <div itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">
                        <meta itemprop="streetAddress" content="${event.location}"/>
                        <meta itemprop="addressCountry" content="ES"/>
                      </div>
                    </div>
                  </div>
                </div>
                In&Out te recuerda tu cita en el centro de ${event.location}, el día <strong>${event.formattedDate}</strong> a las horas <strong>${event.formattedHour}</strong>. 
                No olvides anularla si no puedes acudir a la misma.
            </p>
        </td>
    </tr>
    ${footer()}
    `;
};
