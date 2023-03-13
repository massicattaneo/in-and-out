const { toICSDate } = require("../shared")

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
ORGANIZER;CN=InAndOut:MAILTO:info@inandoutbelleza.com
SUMMARY:${event.description}
LOCATION:InAndOut Belleza - ${event.location}
DESCRIPTION:
END:VEVENT
END:VCALENDAR`
  },
}
