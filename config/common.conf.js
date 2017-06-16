const nodeModulePath = require('path')
const webpack = require('webpack')
const { DefinePlugin, BannerPlugin } = webpack

const NODE_ENV = process.env.NODE_ENV
const PRODUCTION = NODE_ENV === 'production'

module.exports = {
  // output: {},
  entry: { // why Array? check: https://github.com/webpack/webpack/issues/300
    'Dr': [ nodeModulePath.join(__dirname, '../source/Dr') ],
    'Dr.node': [ nodeModulePath.join(__dirname, '../source/Dr.node') ],
    'Dr.browser': [ nodeModulePath.join(__dirname, '../source/Dr.browser') ]
  },
  target: 'node', // support node main modules like 'fs'
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: PRODUCTION ? [ 'stage-0' ] : [ [ 'env', { targets: { node: 'current' } } ] ],
            plugins: [
              'transform-object-rest-spread',
              'transform-class-properties',
              [ 'transform-runtime', { helpers: true, polyfill: false, regenerator: false, moduleName: 'babel-runtime' } ]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    alias: { source: nodeModulePath.resolve(__dirname, '../source') }
  },
  plugins: [].concat(
    new DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify(NODE_ENV), '__DEV__': !PRODUCTION }),
    PRODUCTION ? [ new BannerPlugin({ banner: '/* eslint-disable */', raw: true, test: /\.js$/, entryOnly: false }) ] : []
  )
}
