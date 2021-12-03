"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _path = require("path");

var _helper = _interopRequireDefault(require("./doc/helper"));

var _transform = _interopRequireWildcard(require("./transform"));

var _chalk = _interopRequireDefault(require("chalk"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var _default = _transform.transformContent;
exports["default"] = _default;
process.env.HOME_DIR = (0, _path.dirname)(require.resolve('../package'));
var nodeVersion = process.versions.node;
var versions = nodeVersion.split('.');
var major = versions[0];
var minor = versions[1];

if (major * 10 + minor * 1 < 100) {
  console.log("Node version must >= 10.0, but got ".concat(major, ".").concat(minor));
  process.exit(1);
}

var updater = require('update-notifier');

var pkg = require('../package.json');

var notifier = updater({
  pkg: pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7
});

if (notifier.update && notifier.update.latest !== pkg.version) {
  // 存在新版本
  var old = notifier.update.current;
  var latest = notifier.update.latest;
  var type = notifier.update.type;

  switch (type) {
    case 'major':
      type = _chalk["default"].red(type);
      break;

    case 'minor':
      type = _chalk["default"].yellow(type);
      break;

    case 'patch':
      type = _chalk["default"].green(type);
      break;

    default:
      break;
  }

  notifier.notify({
    message: "New ".concat(type, " version of ").concat(pkg.name, " available! ").concat(_chalk["default"].red(old), " -> ").concat(_chalk["default"].green(latest), "\nRun ").concat(_chalk["default"].green("npm install -g ".concat(pkg.name)), " to update!")
  });
}

var command = process.argv[2];
var args = process.argv.slice(3);
var version = pkg.version;
var outputIndex = args.findIndex(function (o) {
  return o === '-o' || o === '--output';
});
var extraIndex = args.findIndex(function (o) {
  return o === '-i' || o === '--ignore';
});
var isTs = args.includes('-t') || args.includes('--ts');
var cssModule = args.includes('-m') || args.includes('--module'); //  是否模块化css styles[...]

switch (command) {
  case '-v':
  case '--version':
    console.log(version);
    break;

  case '-h':
  case '--help':
    (0, _helper["default"])();
    break;

  default:
    if (!command) (0, _helper["default"])();else {
      var input = (0, _path.resolve)(process.cwd(), command);
      var output = outputIndex > -1 && args[outputIndex + 1] ? (0, _path.resolve)(process.cwd(), args[outputIndex + 1]) : (0, _path.resolve)(process.cwd(), 'react__from__vue');
      var extra = extraIndex > -1 && args[extraIndex + 1] ? args[extraIndex + 1].split(',') : [];
      var options = {
        isTs: isTs,
        cssModule: cssModule,
        extra: extra
      };
      process.options = options;
      (0, _transform["default"])(input, output, options);
    }
    break;
}