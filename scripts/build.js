const vfs = require('vinyl-fs')
const babel = require('@babel/core')
const through = require('through2')
const rimraf = require('rimraf')
const { join } = require('path')

const cwd = process.cwd()

const nodeBabelConfig = {
  presets: [[require.resolve('@babel/preset-env')]],
  plugins: [
    require.resolve('@babel/plugin-transform-runtime'),
    require.resolve('@babel/plugin-proposal-export-default-from'),
    require.resolve('@babel/plugin-proposal-do-expressions'),
    require.resolve('@babel/plugin-proposal-class-properties')
  ]
}

function transform(opts = {}) {
  const { content } = opts
  return babel.transform(content, nodeBabelConfig).code
}

function build() {
  rimraf.sync(join(cwd, 'lib'))
  return vfs
    .src(`./src/**/*.js`)
    .pipe(
      through.obj((f, enc, cb) => {
        f.contents = Buffer.from(
          // eslint-disable-line
          transform({
            content: f.contents
          }),
          'utf8'
        )
        cb(null, f)
      })
    )
    .pipe(vfs.dest(`./lib/`))
}

build()
