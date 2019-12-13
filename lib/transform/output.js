"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fs = require("fs");

var _prettier = require("prettier");

function output(code, target) {
  var parser = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'babel';

  try {
    var formatCode = (0, _prettier.format)(code, {
      parser: parser
    });
    (0, _fs.writeFileSync)(target, formatCode);
  } catch (_unused) {
    (0, _fs.writeFileSync)(target, code);
  }
}

var _default = output;
exports["default"] = _default;