const chalk = require('chalk')
module.exports = function help() {
  console.log(`Usage: trans [targetPath] [options]`)
  console.log(`
  Options:
  -v, --version  output current version
  -o, --output   the output path for react component, which default value is process.cwd()/react__from__vue
  -i, --ignore   fileName or just RegExp is fine => .ts$,ignoreFile.js,ignoreDir  default: node_modules
  -t --ts        it is a typescript component
  -h, --help     output usage information
  `)
  console.log('Examples:')
  console.log('')
  console.log(chalk.gray('  # transform a vue component to react component.'))
  console.log('  $ convert components/test.vue -o components')
  console.log('')
}
