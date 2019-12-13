import { dirname, resolve } from 'path';
import helper from './doc/helper';
import trans from './transform';
import chalk from 'chalk';

process.env.HOME_DIR = dirname(require.resolve('../package'));

const nodeVersion = process.versions.node;
const versions = nodeVersion.split('.');
const major = versions[0];
const minor = versions[1];

if (major * 10 + minor * 1 < 100) {
  console.log(`Node version must >= 10.0, but got ${major}.${minor}`);
  process.exit(1);
}

const updater = require('update-notifier');
const pkg = require('../package.json');
const notifier = updater({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 * 7 });
if (notifier.update && notifier.update.latest !== pkg.version) {
  // 存在新版本
  const old = notifier.update.current;
  const latest = notifier.update.latest;
  let type = notifier.update.type;
  switch (type) {
    case 'major':
      type = chalk.red(type);
      break;
    case 'minor':
      type = chalk.yellow(type);
      break;
    case 'patch':
      type = chalk.green(type);
      break;
    default:
      break;
  }
  notifier.notify({
    message: `New ${type} version of ${pkg.name} available! ${chalk.red(
      old
    )} -> ${chalk.green(latest)}\nRun ${chalk.green(
      `npm install -g ${pkg.name}`
    )} to update!`
  });
}

const command = process.argv[2];
const args = process.argv.slice(3);
const version = pkg.version;
const outputIndex = args.findIndex(o => o === '-o' || o === '--output');
const isTsType = args.includes('-t') || args.includes('--ts');
switch (command) {
  case '-v':
  case '--version':
    console.log(version);
    break;
  case '-h':
  case '--help':
    helper();
    break;
  default:
    if (!command) helper();
    else {
      const input = resolve(process.cwd(), command);
      const output =
        outputIndex && args[outputIndex + 1]
          ? resolve(process.cwd(), args[outputIndex + 1])
          : resolve(process.cwd(), 'react__from__vue');
      trans(input, output, isTsType);
    }
    break;
}
