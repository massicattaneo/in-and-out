const BoxSDK = require('box-node-sdk');
const boxSettings = require('./private/box.json');
const sdk = new BoxSDK(boxSettings);

module.exports = function () {
    const obj = {};

    obj.init = function () {
        return new Promise(function (resolve) {
            sdk.getTokensAuthorizationCodeGrant(authCode, null, function(err, tokenInfo) {
                // tokenInfo: {
                //  accessToken: 'ACCESS_TOKEN',
                //  refreshToken: 'REFRESH_TOKEN',
                //  acquiredAtMS: 1464129218402,
                //  accessTokenTTLMS: 3600000,
                // }
            });
        })
    }
    
    return obj;
}