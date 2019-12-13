"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initProps = initProps;
exports.initData = initData;
exports.initComputed = initComputed;
exports.initComponents = initComponents;

var babelTraverse = require('@babel/traverse')["default"];

var t = require('@babel/types');

var _require = require('./utils'),
    log = _require.log;

var collectVueProps = require('./vue-props');

var collectVueComputed = require('./vue-computed');
/**
 * Collect vue component state(data prop, props prop & computed prop)
 * Don't support watch prop of vue component
 */


function initProps(ast, state) {
  babelTraverse(ast, {
    Program: function Program(path) {
      var nodeLists = path.node.body;
      var count = 0;

      for (var i = 0; i < nodeLists.length; i++) {
        var node = nodeLists[i];

        if (t.isExportDefaultDeclaration(node)) {
          count++;
        }
      }

      if (count > 1 || !count) {
        var msg = !count ? 'Must hava one' : 'Only one';
        log("".concat(msg, " export default declaration in youe vue component file"));
        process.exit();
      }
    },
    ObjectProperty: function ObjectProperty(path) {
      var parent = path.parentPath.parent;
      var name = path.node.key.name;

      if (parent) {
        if (name === 'name') {
          if (t.isStringLiteral(path.node.value)) {
            state.name = path.node.value.value;
          } else {
            log("The value of name prop should be a string literal.");
          }
        } else if (name === 'props') {
          collectVueProps(path, state);
          path.stop();
        }
      }
    }
  });
}

;

function initData(ast, state) {
  babelTraverse(ast, {
    ObjectMethod: function ObjectMethod(path) {
      // 对象方法
      var parent = path.parentPath.parent;
      var name = path.node.key.name;

      if (parent && t.isExportDefaultDeclaration(parent)) {
        if (name === 'data') {
          var body = path.node.body.body;
          state.data['_statements'] = [].concat(body);
          var propNodes = {};
          body.forEach(function (node) {
            if (t.isReturnStatement(node)) {
              propNodes = node.argument.properties;
            }
          });
          propNodes.forEach(function (propNode) {
            state.data[propNode.key.name] = propNode.value;
          });
          path.stop();
        }
      }
    }
  });
}

;

function initComputed(ast, state) {
  babelTraverse(ast, {
    ObjectProperty: function ObjectProperty(path) {
      var parent = path.parentPath.parent;
      var name = path.node.key.name;

      if (parent) {
        if (name === 'computed') {
          collectVueComputed(path, state);
          path.stop();
        }
      }
    }
  });
}

;

function initComponents(ast, state) {
  babelTraverse(ast, {
    ObjectProperty: function ObjectProperty(path) {
      var parent = path.parentPath.parent;
      var name = path.node.key.name;

      if (parent && t.isExportDefaultDeclaration(parent)) {
        if (name === 'components') {
          // collectVueComputed(path, state);
          var props = path.node.value.properties;
          props.forEach(function (prop) {
            state.components[prop.key.name] = prop.value.name;
          });
          path.stop();
        }
      }
    }
  });
}

;