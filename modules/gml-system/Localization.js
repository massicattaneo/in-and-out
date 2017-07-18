/* eslint require-jsdoc: 'off' */

export default function Localization() {
    const loc = {};
    const i18n = {};

    loc.load = async(file) => {
        return fetch(file, {
            headers: new Headers({
                'Content-type': 'application/json'
            })
        }).then((response) => {
            return response.json().then(function (json) {
                Object.assign(i18n, json)
            });
        })
    };

    loc.get = (id, ...args) => {
        return [i18n[id], ...args].reduce((a, b, i) => {
            return a.replace(`{${i - 1}}`, b);
        });
    };

    return loc;
}
