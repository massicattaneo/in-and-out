const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: ['./modules/gml-public/index.js'],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: `gml-system.${pkg.version}.min.js`,
        library: 'gml',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {
                test: /\.js?$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: 'head',
            filename: 'public-example.html',
            template: './modules/gml-public/html-templates/public.html'
        }),
        new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            compressor: {
                warnings: false,
                // TODO remove code that does constructor.name string comparisons and disable this
                keep_fnames: true
            },
            mangle: {
                // TODO remove code that does constructor.name string comparisons and disable this
                keep_fnames: true
            },
            comments: false
        })
    ]

};
