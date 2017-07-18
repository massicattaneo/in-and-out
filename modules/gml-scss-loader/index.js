const scssToJson = require('./scssToJson');

module.exports = function (source) {
    return `export const style = ${JSON.stringify(scssToJson(source))}`;
};
