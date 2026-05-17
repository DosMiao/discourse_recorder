const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

const headerPath = path.resolve(__dirname, 'Dev/src/header.txt');
const banner = fs.existsSync(headerPath)
    ? fs.readFileSync(headerPath, 'utf8')
    : '// header.txt missing';

const isProduction = process.env.NODE_ENV === 'production';
const sourceMapFlag = (process.env.SOURCE_MAP || '').toString().toLowerCase();
const enableSourceMap =
    !isProduction || (sourceMapFlag === '1' || sourceMapFlag === 'true' || sourceMapFlag === 'inline');
const inlineSourceMap = sourceMapFlag === 'inline';

const outFile = 'discourse-text-recorder.user.js';

module.exports = {
    mode: isProduction ? 'production' : 'development',
    entry: './Dev/src/main.ts',
    target: 'web',
    output: {
        path: path.resolve(__dirname, '.dist'),
        filename: outFile,
        sourceMapFilename: '[file].map',
    },
    devtool: enableSourceMap ? (inlineSourceMap ? 'inline-source-map' : 'source-map') : false,
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        modules: [path.resolve(__dirname, 'Dev/src'), 'node_modules'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        modules: false,
                                        targets: [
                                            'last 2 Chrome versions',
                                            'last 2 Firefox versions',
                                            'last 2 Edge versions',
                                        ],
                                        useBuiltIns: false,
                                    },
                                ],
                            ],
                        },
                    },
                    {
                        loader: 'ts-loader',
                        options: { transpileOnly: true },
                    },
                ],
            },
        ],
    },
    plugins: [
        new webpack.BannerPlugin({
            banner,
            raw: true,
            entryOnly: true,
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
            __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        }),
    ],
    optimization: {
        // Userscripts are typically read/audited by users — keep readable.
        minimize: false,
        concatenateModules: false,
        runtimeChunk: false,
        splitChunks: false,
    },
    performance: { hints: false },
    stats: 'minimal',
};
