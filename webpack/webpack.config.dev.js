const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const devServer = 'webpack-hot-middleware/client?reload=true';
const fs = require('fs');
const pkg = require('../package');

const config = {
    entry: {
        public: [
            'babel-regenerator-runtime',
            devServer,
            './src/public/system.js'
        ],
        admin: [
            'babel-regenerator-runtime',
            devServer,
            './src/admin/system.js'
        ]
    },
    output: {
        path: path.join(__dirname, '/dist/'),
        filename: '[name].bundle.js'
    },
    devtool: 'source-map',
    resolveLoader: {
        modules: ['modules/', 'node_modules']
    },
    module: {
        loaders: [
            {
                test: /\.hbs$/,
                loader: 'handlebars-loader'
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3)$/,
                loader: 'file'
            },
            {
                test: /.(html)$/,
                exclude: [
                    path.resolve(__dirname, 'index.html')
                ],
                use: 'raw-loader'
            },
            {
                test: /.(scss)$/,
                use: 'gml-scss-loader'
            },
            {
                test: /\.json$/,
                use: 'json-loader'
            },
            {
                test: /\.map$/,
                use: 'gml-map-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        modules: ['modules/','node_modules'],
        descriptionFiles: ['package.json']
    },
    plugins: [
        new HtmlWebpackPlugin({
            // chunks: ['public'],
            template: 'src/index.hbs',
            inject: false,
            filename: './index.html',
            version: pkg.version,
            isSpider: '{{isSpider}}',
            stripeKey: 'pk_test_gPjcEmmMg0jWcuU6BA44q2Em',
            body: '{{body}}',
            description: '{{description}}',
            title: '{{title}}',
            image: '{{image}}',
            breadcrumb: '{{breadcrumb}}',
            style: '{{style}}'
        }),
        new HtmlWebpackPlugin({
            chunks: ['admin'],
            template: 'src/admin.hbs',
            inject: false,
            filename: './admin.html',
            version: pkg.version
        }),
        new CopyWebpackPlugin([
            { from: './src/css', to: 'css' },
            { from: './src/localization', to: 'localization' },
            { from: './src/assets', to: 'assets' }
        ]),
        new webpack.HotModuleReplacementPlugin(),
    ]
};

fs.readdirSync('./src/apps/').forEach(function (name) {
    if (fs.lstatSync('./src/apps/'+name).isDirectory()) {
        config.entry[name] = [
            'babel-regenerator-runtime',
            devServer,
            `./src/apps/${name}/index.js`
        ]
    }
});

module.exports = config;
