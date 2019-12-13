const chalk = require('chalk')
module.exports = function help() {
  console.log(`Usage: trans [targetPath] [options]`)
  console.log(`
  Options:
  -v, --version  output current version
  -o, --output   the output path for react component, which default value is process.cwd()/react__from__vue
  -t --ts        it is a typescript component
  -h, --help     output usage information
  `)
  console.log('Examples:')
  console.log('')
  console.log(chalk.gray('  # transform a vue component to react component.'))
  console.log('  $ convert components/test.vue -o components')
  console.log('')
}
