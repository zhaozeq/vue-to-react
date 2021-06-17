"use strict";

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = transfromTemplate;

var _vueTemplateCompiler = require("vue-template-compiler");

var t = _interopRequireWildcard(require("@babel/types"));

var _generateElement = require("./generate-element");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 保证名称一致 '@click' => v-on:click  :text => v-bind:text
 * class  ==>  className
 * @param {*} ast
 */
function flatName(ast) {
  var isNochild = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (ast.ifConditions && ast.ifConditions.length && !isNochild) {
    ast.ifConditions.map(function (_ref) {
      var block = _ref.block;
      return flatName(block, true);
    });
  } else if (ast && ast.type === 1) {
    var attrsList = [];
    var attrObj = ast.attrsMap;
    Object.keys(attrObj).map(function (o) {
      var key = o;
      if (key === 'v-if' || key === 'v-else-if' || key === 'v-else') return;else if (/^:/.test(o)) {
        // 统一成v-bind
        key = o.replace(/^:/, 'v-bind:');
      } else if (/^@/.test(o)) key = o.replace(/^@/, 'v-on:');
      attrsList.push({
        key: key,
        value: attrObj[o]
      });
    });
    ast.attrsList = attrsList;
    if (!ast.children) return;
    ast.children.map(function (o) {
      return flatName(o);
    });
  }
}

function transfromTemplate(template, state) {
  var ast = (0, _vueTemplateCompiler.compile)(template).ast;
  flatName(ast); // 统一name 如：@click => v-on:click

  var argument = (0, _generateElement.generateJSXElement)(ast, null, state);

  if (t.isJSXElement(argument)) {
    argument = t.returnStatement(argument);
  }

  return argument;
}