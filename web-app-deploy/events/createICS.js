const { toICSDate } = require('../shared');

module.exports = {
    createICS: function (event) {
        return `BEGIN:VCALENDAR
VERSION:2.0
METHOD:PUBLISH
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTART;TZID=Europe/Madrid:${toICSDate(event.startDate)}
DTEND;TZID=Europe/Madrid:${toICSDate(event.endDate)}
UID:${event.bookId}
ORGANIZER;CN=In&Out:MAILTO:info@inandoutbelleza.com
SUMMARY:In&Out Belleza
LOCATION:${event.location}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;
    }
};
