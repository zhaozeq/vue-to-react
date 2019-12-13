"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.genSFCRenderMethod = genSFCRenderMethod;

var t = _interopRequireWildcard(require("@babel/types"));

function genSFCRenderMethod(path, state, argument) {
  // computed props
  var computedProps = Object.keys(state.computeds);
  var blocks = [];

  if (computedProps.length) {
    computedProps.forEach(function (prop) {
      var v = state.computeds[prop];
      blocks = blocks.concat(v['_statements']);
    });
  }

  if (argument) blocks = blocks.concat(argument);
  var render = t.classMethod('method', t.identifier('render'), [], t.blockStatement(blocks));
  path.node.body.push(render);
}