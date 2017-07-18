export default function () {
    const obj = {};

    obj.setItem = function (name, value, exdays, path) {
        const exDate = new Date();
        exDate.setDate(exDate.getDate() + exdays);
        const expires = ((exdays === null) ? '' : ` expires=${exDate.toUTCString()}`);
        const cookieValue = `${encodeURI(value)}${expires}; path=${path}`;
        document.cookie = `${name}=${cookieValue}`;
    };

    obj.getItem = function (name) {
        let value = document.cookie;
        let start = value.indexOf(` ${name}=`);

        if (start === -1) {
            start = value.indexOf(`${name}=`);
        }

        if (start === -1) {
            value = null;
        }
        else {
            start = value.indexOf('=', start) + 1;
            let end = value.indexOf(';', start);
            if (end === -1) {
                end = value.length;
            }
            value = decodeURI(value.substring(start, end));
        }
        return value;
    };

    obj.removeItem = function (name, path) {
        obj.set(name, '', -1, path);
    };

    return obj;
}
