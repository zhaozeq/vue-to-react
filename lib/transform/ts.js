"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;

var _traverse = _interopRequireDefault(require("@babel/traverse"));

/**
 * 用于去除ts类型检测
 * @export
 * @param {*} ast
 * @returns
 */
function _default(ast) {
  (0, _traverse["default"])(ast, {
    ExportNamedDeclaration: function ExportNamedDeclaration(exportPath) {
      var declaration = exportPath.get('declaration');

      if (declaration && (declaration.isTSInterfaceDeclaration() || declaration.isTSTypeAliasDeclaration())) {
        exportPath.remove();
      }
    },
    TSTypeParameterInstantiation: function TSTypeParameterInstantiation(path) {
      path.remove();
    },
    TSTypeAnnotation: function TSTypeAnnotation(path) {
      path.remove();
    },
    TSAsExpression: function TSAsExpression(path) {
      path.replaceWith(path.get('expression'));
    }
  });
  return ast;
}