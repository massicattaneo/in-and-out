module.exports = {
    createICS: function (event) {
        return `BEGIN:VCALENDAR
VERSION:2.0
METHOD:PUBLISH
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTART;TZID=Europe/Madrid:${new Date(event.startDate).toISOString().replace(/-/g, '').replace(/:/g, '').substr(0,15)}
DTEND;TZID=Europe/Madrid:${new Date(event.endDate).toISOString().replace(/-/g, '').replace(/:/g, '').substr(0,15)}
UID:${event.bookId}
ORGANIZER;CN=In&Out:MAILTO:info@inandoutbelleza.com
SUMMARY:In&Out Belleza
LOCATION:${event.location}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;
    }
};
