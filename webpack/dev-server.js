const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.dev.js');
const path = require('path');
const fs = require('fs');

module.exports = function (app, express, google, posts) {

    const compiler = webpack(config);
    const middleware = webpackMiddleware(compiler, {
        publicPath: config.output.publicPath,
        contentBase: '../src',
        stats: {
            colors: true,
            hash: false,
            timings: true,
            chunks: false,
            chunkModules: false,
            modules: false
        }
    });

    app.use(middleware);
    app.use(webpackHotMiddleware(compiler));

    app.use(express.static(__dirname));

    return function response(req, res) {
        const isAdmin = req.path.substr(0, 6) === '/admin';
        if (isAdmin) {
            const file = middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/admin.html'));
            res.write(file);
            res.end();
        }
    };

};