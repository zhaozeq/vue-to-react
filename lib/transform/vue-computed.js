"use strict";

var t = require('@babel/types');

var _require = require('./utils'),
    getIdentifier = _require.getIdentifier,
    log = _require.log;

var nestedMethodsVisitor = {
  VariableDeclaration: function VariableDeclaration(path) {
    var _this = this;

    var declarations = path.node.declarations;
    declarations.forEach(function (d) {
      if (t.isMemberExpression(d.init)) {
        var key = d.init.property.name;
        d.init.object = t.memberExpression(t.thisExpression(), getIdentifier(_this.state, key));
      }
    });
  },
  ExpressionStatement: function ExpressionStatement(path) {
    var expression = path.node.expression;

    if (t.isCallExpression(expression) && !t.isThisExpression(expression.callee.object)) {
      path.traverse({
        ThisExpression: function ThisExpression(memPath) {
          var key = memPath.parent.property.name;
          memPath.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(this.state, key)));
          memPath.stop();
        }
      }, {
        state: this.state
      });
    }

    if (t.isAssignmentExpression(expression)) {// return log(`Don't do assignment in ${this.key} computed prop`);
    }
  },
  ReturnStatement: function ReturnStatement(path) {
    path.traverse({
      ThisExpression: function ThisExpression(memPath) {
        var key = memPath.parent.property.name;
        memPath.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(this.state, key)));
        memPath.stop();
      }
    }, {
      state: this.state
    });
  }
};

module.exports = function collectVueComputed(path, state) {
  var childs = path.node.value.properties;
  var parentKey = path.node.key.name; // computed;

  if (childs.length) {
    path.traverse({
      ObjectMethod: function ObjectMethod(propPath) {
        var key = propPath.node.key.name;

        if (!state.computeds[key]) {
          propPath.traverse(nestedMethodsVisitor, {
            state: state,
            key: key
          });
          var varNode = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(key), t.arrowFunctionExpression(propPath.node.params, propPath.node.body))]);
          state.computeds[key] = {
            _statements: [varNode]
          };
        }
      }
    });
  }
};