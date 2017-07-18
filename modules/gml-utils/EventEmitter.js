export default function () {
    const events = [];
    const obj = {};

    obj.on = function (eventName, callback) {
        const item = {eventName,callback};
        events.push(item);
        return () => events.splice(item, 1);
    };

    obj.off = function (eventName, callback) {
        const filter = events.filter(function (e) {
            return e.eventName === eventName && e.callback === callback;
        })[0];
        events.splice(events.indexOf(filter), 1);
    };

    obj.emit = function (eventName, param) {
        events
            .filter(e => e.eventName === eventName)
            .forEach(e => e.callback(param));
    };

    return obj;
}
