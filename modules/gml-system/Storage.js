/* eslint require-jsdoc: 'off' */

import {default as CookieManager} from '../gml-utils/cookieManager';

export default function Storage(p) {
    var obj = {};
    var path = p.cookiePath || '/';
    var storage = CookieManager();
    var prefix = (p.prefix) ? p.prefix + '.' : '';

    function prefixProperty(propertyName) {
        return prefix + propertyName;
    }
    obj.set = function (params) {
        params &&
        Object.keys(params).forEach(function (name) {
            storage.setItem(prefixProperty(name), JSON.stringify(params[name]), 365, path);
        })
    };
    obj.get = function (propertyName) {
        return JSON.parse(storage.getItem(prefixProperty(propertyName)));
    };
    obj.remove = function (propertyName) {
        storage.removeItem(prefixProperty(propertyName), path);
    };

    return obj;
}
