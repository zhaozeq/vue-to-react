"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.genImports = genImports;
exports.genConstructor = genConstructor;
exports.genStaticProps = genStaticProps;
exports.genClassMethods = genClassMethods;

var t = require('babel-types');

var chalk = require('chalk');

var _require = require('./utils'),
    genDefaultProps = _require.genDefaultProps,
    genPropTypes = _require.genPropTypes;

function genImports(path, collect, cssSuffixName) {
  var nodeLists = path.node.body;
  var importReact = t.importDeclaration([t.importDefaultSpecifier(t.identifier('React')), t.importSpecifier(t.identifier('Component'), t.identifier('Component'))], t.stringLiteral('react'));
  var importCss = t.importDeclaration([t.importDefaultSpecifier(t.identifier('styles'))], t.stringLiteral("./".concat(cssSuffixName)));
  collect.imports.push(importReact);
  collect.imports.unshift(importCss);
  collect.imports.forEach(function (node) {
    return nodeLists.unshift(node);
  });
}

function genConstructor(path, state) {
  var nodeLists = path.node.body;
  var blocks = [t.expressionStatement(t.callExpression(t["super"](), [t.identifier('props')]))];

  if (state.data['_statements']) {
    state.data['_statements'].forEach(function (node) {
      if (t.isReturnStatement(node)) {
        var props = node.argument.properties; // supports init data property with props property

        props.forEach(function (n) {
          if (t.isMemberExpression(n.value)) {
            n.value = t.memberExpression(t.identifier('props'), t.identifier(n.value.property.name));
          }
        });
        blocks.push(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.thisExpression(), t.identifier('state')), node.argument)));
      } else {
        blocks.push(node);
      }
    });
  }

  var ctro = t.classMethod('constructor', t.identifier('constructor'), [t.identifier('props')], t.blockStatement(blocks));
  nodeLists.push(ctro);
}

function genStaticProps(path, state) {
  var props = state.props;
  var nodeLists = path.node.body;

  if (Object.keys(props).length) {
    // nodeLists.push(genPropTypes(props));
    nodeLists.push(genDefaultProps(props));
  }
}

function genClassMethods(path, state) {
  var nodeLists = path.node.body;
  var methods = state.classMethods;

  if (Object.keys(methods).length) {
    Object.keys(methods).forEach(function (key) {
      nodeLists.push(methods[key]);
    });
  }
}