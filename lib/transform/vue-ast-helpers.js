"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleCycleMethods = handleCycleMethods;
exports.handleGeneralMethods = handleGeneralMethods;

var t = require('@babel/types');

var _require = require('./utils'),
    log = _require.log,
    getIdentifier = _require.getIdentifier,
    getStateOrProp = _require.getStateOrProp,
    camelName = _require.camelName;

var nestedMethodsVisitor = {
  // VariableDeclaration(path) {
  //   const declarations = path.node.declarations;
  //   declarations.forEach(d => {
  //     if (t.isMemberExpression(d.init)) {
  //       const key = d.init.property.name;
  //       d.init.object = t.memberExpression(
  //         t.thisExpression(),
  //         getIdentifier(this.state, key)
  //       );
  //     }
  //   });
  // },
  ExpressionStatement: function ExpressionStatement(path) {
    var expression = path.node.expression;

    if (t.isAssignmentExpression(expression) && t.isThisExpression(expression.left.object)) {
      // 针对 this[props] = varible  => this.setState({props:varible})
      var right = expression.right;
      var leftNode = expression.left.property;
      var key = leftNode;

      if (t.isTemplateLiteral(leftNode)) {
        // 模板字符串作为key时需处理
        key = t.identifier("TemplateLiteral_".concat(+new Date()));
        var declarator = t.variableDeclarator(key, leftNode);
        var declaration = t.variableDeclaration('const', [declarator]);
        path.parent.body.unshift(declaration);
      }

      path.node.expression = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('setState')), [t.objectExpression([t.objectProperty(key, right, t.isExpression(key))])]);
    }

    if (t.isCallExpression(expression) && t.isThisExpression(expression.callee.object) && expression.callee.property.name === '$emit') {
      // this.$emit('xxx',data) => this.props.xxx(data)
      path.traverse({
        CallExpression: function CallExpression(memPath) {
          var args = memPath.node.arguments;

          if (!t.isStringLiteral(args[0])) {
            log("this.$emit(".concat(args[0].name, ", ").concat(args[1].name, ") :"));
            log('  expected string type but got ' + args[0].type);
            return;
          }

          var property = t.isStringLiteral(args[0]) ? t.identifier(camelName(args[0].value, ':')) : args[0];
          memPath.replaceWith(t.callExpression(t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('props')), property), args[1] ? [args[1]] : []));
          memPath.stop();
        }
      });
    }
  },
  MemberExpression: function MemberExpression(path) {
    var node = path.node;

    if (t.isThisExpression(node.object)) {
      var key = node.property.name;

      if (key !== 'state' && key !== 'props' && key !== '$refs') {
        var replaceStr = getStateOrProp(this.state, key);
        path.get('object') // 获取`ThisExpresssion`
        .replaceWithSourceString(replaceStr);
        path.stop();
      }
    }

    if (t.isMemberExpression(node.object) && node.object.property.name === '$refs') {
      path.get('object') // 获取`ThisExpresssion`
      .replaceWithSourceString('this');
      path.stop();
    }
  }
};

function createClassMethod(path, state, name) {
  var body = path.node.body;
  var params = path.node.params;
  var blocks = [];

  if (name === 'componentDidCatch') {
    params = [t.identifier('error'), t.identifier('info')];
  }

  path.traverse(nestedMethodsVisitor, {
    blocks: blocks,
    state: state
  });
  return t.classProperty(t.identifier(name), t.arrowFunctionExpression(params, t.blockStatement(body.body)));
}

function replaceThisExpression(path, key, state) {
  if (state.data[key] || state.props[key]) {
    path.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(state, key)));
  } else {
    // from computed
    path.parentPath.replaceWith(t.identifier(key));
  }

  path.stop();
}

function createRenderMethod(path, state, name) {
  if (path.node.params.length) {
    log("\n            Maybe you will call $createElement or h method in your render, but react does not support it.\n            And it's maybe cause some unknown error in transforming\n        ");
  }

  path.traverse({
    ThisExpression: function ThisExpression(thisPath) {
      var parentNode = thisPath.parentPath.parentPath.parent;
      var isValid = t.isExpressionStatement(parentNode) || t.isVariableDeclaration(parentNode) || t.isBlockStatement(parentNode) || t.isJSXElement(parentNode) || t.isCallExpression(parentNode) || t.isJSXAttribute(parentNode) && !parentNode.name.name.startsWith('on');

      if (isValid) {
        // prop
        var key = thisPath.parent.property.name;
        replaceThisExpression(thisPath, key, state);
      }
    },
    JSXAttribute: function JSXAttribute(attrPath) {
      var attrNode = attrPath.node;

      if (attrNode.name.name === 'class') {
        attrPath.replaceWith(t.jSXAttribute(t.jSXIdentifier('className'), attrNode.value));
      }

      if (attrNode.name.name === 'domPropsInnerHTML') {
        var v = attrNode.value;

        if (t.isLiteral(v)) {
          attrPath.replaceWith(t.jSXAttribute(t.jSXIdentifier('dangerouslySetInnerHTML'), t.jSXExpressionContainer(t.objectExpression([t.objectProperty(t.identifier('__html'), attrNode.value)]))));
        } else if (t.isJSXExpressionContainer(v)) {
          var expression = v.expression;

          if (t.isMemberExpression(expression)) {
            attrPath.traverse({
              ThisExpression: function ThisExpression(thisPath) {
                var key = thisPath.parent.property.name;
                replaceThisExpression(thisPath, key, state);
              }
            });
          }

          attrPath.replaceWith(t.jSXAttribute(t.jSXIdentifier('dangerouslySetInnerHTML'), t.jSXExpressionContainer(t.objectExpression([t.objectProperty(t.identifier('__html'), expression)]))));
        }
      }
    }
  });
  var blocks = []; // computed props

  var computedProps = Object.keys(state.computeds);

  if (computedProps.length) {
    computedProps.forEach(function (prop) {
      var v = state.computeds[prop];
      blocks = blocks.concat(v['_statements']);
    });
  }

  blocks = blocks.concat(path.node.body.body);
  return t.classMethod('method', t.identifier(name), [], t.blockStatement(blocks));
}

function handleCycleMethods(path, collect, state, name, cycleName, isSFC) {
  if (name === 'render') {
    if (isSFC) {
      return;
    }

    collect.classMethods[cycleName] = createRenderMethod(path, state, name);
  } else {
    collect.classMethods[cycleName] = createClassMethod(path, state, cycleName);
  }
}

function handleGeneralMethods(path, collect, state, name) {
  var methods = createClassMethod(path, state, name);
  collect.classMethods[name] = methods;
  state.classMethods[name] = methods;
}