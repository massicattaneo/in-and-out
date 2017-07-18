const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const config = require('./webpack.config.base.js');
const compiler = webpack(config);
const path = require('path');
const open = require('open');

const params = {
    host: 'localhost',
    port: 8080
};

process.argv.splice(0, 2).forEach(function (val) {
    params[val.split('=')[0]] = val.split('=')[1];
});

const server = new WebpackDevServer(compiler, {
    contentBase: path.resolve(__dirname, './src'),
    stats: { colors: true }
    /*proxy: {
        target: '/index.html',
        logLevel: 'debug',
        '/url': {
            target: 'http://proxy-to',
            pathRewrite: { "^/integrationservices": "" },
            secure: false,
            changeOrigin: true
        }
    }*/
});

server.listen(params.port, params.host, function () {
    open(`http://${params.host}:${params.port}/index.html`)
});

