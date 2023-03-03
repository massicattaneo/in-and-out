const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const pkg = require('../package');
const WebpackAutoInject = require('webpack-auto-inject-version');

const array = pkg.version.split('.');
const version = `${array[0]}.${array[1]}.${Number(array[2]) + 1}`;

const config = {
    entry: {
        // public: [
        //     'babel-regenerator-runtime',
        //     './src/public/system.js'
        // ],
        admin: [
            'babel-regenerator-runtime',
            './src/admin/system.js'
        ]
    },
    output: {
        path: path.resolve(__dirname, '../web-app-deploy/static'),
        filename: '[name].[hash].bundle.js'
    },
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
        modules: ['modules/', 'node_modules'],
        descriptionFiles: ['package.json']
    },
    plugins: [
        new WebpackAutoInject({
            components: {
                AutoIncreaseVersion: true
            }
        }),
        // new HtmlWebpackPlugin({
        //     template: 'src/index.hbs',
        //     filename: './index.html',
        //     inject: false,
        //     minify: {
        //         collapseWhitespace: true,
        //         minifyCSS: true,
        //         minifyJS: true,
        //         removeAttributeQuotes: false,
        //         removeComments: true
        //     },
        //     version,
        //     isSpider: '{{isSpider}}',
        //     stripeKey: 'pk_live_2STcLq3AN81f1gSQgJ8YBpss',
        //     body: '{{body}}',
        //     description: '{{description}}',
        //     title: '{{title}}',
        //     image: '{{image}}',
        //     breadcrumb: '{{breadcrumb}}',
        //     style: '{{style}}'
        // }),
        new HtmlWebpackPlugin({
            chunks: ['admin'],
            template: 'src/admin.hbs',
            filename: './admin.html',
            inject: false,
            minify: {
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                removeAttributeQuotes: true,
                removeComments: true
            },
            version
        }),
        new CopyWebpackPlugin([
            { from: './src/css', to: 'css' },
            { from: './src/localization', to: 'localization' },
            { from: './src/assets', to: 'assets' }
        ]),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            compressor: {
                warnings: false,
                keep_fnames: true
            },
            mangle: {
                keep_fnames: true
            },
            comments: false
        })
    ]
};

// fs.readdirSync('./src/apps/').forEach(function (name) {
//     if (fs.lstatSync('./src/apps/' + name).isDirectory()) {
//         config.entry[name] = [
//             'babel-regenerator-runtime',
//             `./src/apps/${name}/index.js`
//         ]
//     }
// });

module.exports = config;
