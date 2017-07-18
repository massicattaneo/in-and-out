const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const config = {
    entry: {
        game: [
            'babel-regenerator-runtime',
            'webpack-dev-server/client?http://localhost:8080/',
            './src/game.js'
        ]
    },
    output: {
        path: path.resolve(__dirname, '../dev'),
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
                test: /\.(js)$/,
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
                use: 'gml-html-loader'
            },
            {
                test: /.(scss)$/,
                use: 'gml-scss-loader'
            },
            {
                test: /\.json$/,
                use: 'json-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        modules: ['modules/','node_modules'],
        descriptionFiles: ['package.json']
    },
    plugins: [
        new HtmlWebpackPlugin({ template: 'src/index.hbs' }),
        new CopyWebpackPlugin([
            { from: './src/css', to: 'css' },
            { from: './src/localization', to: 'localization' },
            { from: './src/assets', to: 'assets' }
        ])
    ]
};

module.exports = config;
