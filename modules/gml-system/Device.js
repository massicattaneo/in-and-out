/* eslint require-jsdoc: 'off' */

const getBrowserInfo = (ua) => {
    if (ua.match(/(OPR)[^\d]\d*.\d*/)) {
        return ['', 'opera', ua.match(/OPR[^\d](\d*.\d*)/)[1]];
    } else if (ua.match(/(Chrome)\/(\d*\.\d*)/)) {
        return (ua.match(/(Chrome)\/(\d*\.\d*)/));
    } else if (ua.match(/(Firefox)\/(\d*\.\d*)/)) {
        return (ua.match(/(Firefox)\/(\d*\.\d*)/));
    } else if (ua.match(/(Safari)\/(\d*\.\d*)/)) {
        const newVar = (ua.match(/(Version)\/(\d*\.\d*)/));
        newVar[1] = 'Safari';
        return newVar;
    } else if (ua.match(/Trident\/(\d)/)) {
        const match = Number(ua.match(/Trident\/(\d)/)[1]) + 4;
        return ['', 'IE', match.toString()];
    }
    return ['', '', ''];
};
const getOsInfo = (ua) => {
    let ret = ['', ''];
    if (ua.match(/WOW64/)) {
        ret[0] = 'windows';
        if (ua.match(/Windows NT 6/)) {
            ret[1] = '7';
        }
    } else if (ua.match(/Macintosh/)) {
        ret[0] = 'Macintosh';
        ret[1] = ua.match(/Mac OS X (\d*[^\d]\d*)/)[1].replace('_', '.');
    } else if (ua.match(/Linux/)) {
        ret = ['Linux', 'UNKNOWN'];
    }
    return ret;
};

export default function Device(navigator) {
    const device = {};
    const ua = navigator.userAgent;
    const osInfo = getOsInfo(ua);
    const browserInfo = getBrowserInfo(ua);
    device.type = (!/(Mobi|iPad|Tablet|Android)/i.test(ua)) ? 'desktop' : 'mobile';
    device.os = osInfo[0];
    device.osVersion = osInfo[1];
    device.browserName = browserInfo[1].toLowerCase();
    device.browserVersion = browserInfo[2];
    device.quality = 1;

    return device;
}
