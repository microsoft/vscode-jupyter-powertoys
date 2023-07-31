/* eslint-disable */
//@ts-check

'use strict';

const path = require('path');
const tsconfig_paths_webpack_plugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');
const constants = require('./build/constants');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');

// tslint:disable-next-line:no-var-requires no-require-imports
const configFileName = path.join(constants.ExtensionRootDir, 'tsconfig.extension.web.json');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: 'webworker', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
    entry: './src/extension.web.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        filename: 'web.main.js',
        path: path.resolve(constants.ExtensionRootDir, 'out'),
        libraryTarget: 'commonjs2'
    },
    node: {
        __dirname: false,
        __filename: false
    },
    externals: ['vscode', 'commonjs', 'electron', 'crypto'], // Don't bundle these,
    plugins: [
        // Work around for Buffer is undefined:
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser' // provide a shim for the global `process` variable
        }),
        new webpack.DefinePlugin({
            // Definitions...
            BROWSER: JSON.stringify(true),
            process: {
                platform: JSON.stringify('web')
            }
        }),
        new CleanTerminalPlugin()
    ],
    resolve: {
        extensions: ['.ts', '.js'],
        mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
        plugins: [
            new tsconfig_paths_webpack_plugin.TsconfigPathsPlugin({ configFile: configFileName, logLevel: 'INFO' })
        ],
        alias: {
            // provides alternate implementation for node module and source files
        },
        fallback: {
            // Webpack 5 no longer polyfills Node.js core modules automatically.
            // see https://webpack.js.org/configuration/resolve/#resolvefallback
            // for the list of Node.js core module polyfills.
            assert: require.resolve('assert'),
            buffer: require.resolve('buffer'),
            os: require.resolve('os-browserify/browser')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.json'
                        }
                    }
                ]
            },
            {
                test: /\.svg$/,
                use: ['svg-inline-loader']
            }
        ]
    },
    infrastructureLogging: {
        level: 'log' // enables logging required for problem matchers
    },
    watchOptions: {
        aggregateTimeout: 200,
        poll: 1000,
        ignored: /node_modules/
    },
    stats: {
        builtAt: true
    }
};
module.exports = [extensionConfig];
