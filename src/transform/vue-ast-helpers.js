const t = require('babel-types');
const { log, getIdentifier, getStateOrProp, camelName } = require('./utils');

const nestedMethodsVisitor = {
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

  ExpressionStatement(path) {
    const expression = path.node.expression;
    if (
      t.isAssignmentExpression(expression) &&
      t.isThisExpression(expression.left.object)
    ) {
      // 针对 this[props] = varible  => this.setState({props:varible})
      const right = expression.right;
      const leftNode = expression.left.property;
      let key = leftNode;
      if (t.isTemplateLiteral(leftNode)) {
        // 模板字符串作为key时需处理
        key = t.identifier(`TemplateLiteral_${+new Date()}`);
        const declarator = t.variableDeclarator(key, leftNode);
        const declaration = t.variableDeclaration('const', [declarator]);
        path.parent.body.unshift(declaration);
      }
      path.node.expression = t.callExpression(
        t.memberExpression(t.thisExpression(), t.identifier('setState')),
        [
          t.objectExpression([
            t.objectProperty(key, right, t.isExpression(key))
          ])
        ]
      );
    }
    if (
      t.isCallExpression(expression) &&
      t.isThisExpression(expression.callee.object) &&
      expression.callee.property.name === '$emit'
    ) {
      // this.$emit('xxx',data) => this.props.xxx(data)
      path.traverse({
        CallExpression(memPath) {
          const args = memPath.node.arguments;
          if (!t.isStringLiteral(args[0])) {
            log(`this.$emit(${args[0].name}, ${args[1].name}) :`);
            log('  expected string type but got ' + args[0].type);
            return;
          }
          const property = t.isStringLiteral(args[0])
            ? t.identifier(camelName(args[0].value, ':'))
            : args[0];
          memPath.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.memberExpression(t.thisExpression(), t.identifier('props')),
                property
              ),
              args[1] ? [args[1]] : []
            )
          );
          memPath.stop();
        }
      });
    }
  },

  MemberExpression(path) {
    const node = path.node;
    if (t.isThisExpression(node.object)) {
      const key = node.property.name;
      if (key !== 'state' && key !== 'props' && key !== '$refs') {
        const replaceStr = getStateOrProp(this.state, key);
        path
          .get('object') // 获取`ThisExpresssion`
          .replaceWithSourceString(replaceStr);
        path.stop();
      }
    }
    if (
      t.isMemberExpression(node.object) &&
      node.object.property.name === '$refs'
    ) {
      path
        .get('object') // 获取`ThisExpresssion`
        .replaceWithSourceString('this');
      path.stop();
    }
  }
};

function createClassMethod(path, state, name) {
  const body = path.node.body;
  const blocks = [];
  let params = [];

  if (name === 'componentDidCatch') {
    params = [t.identifier('error'), t.identifier('info')];
  }
  path.traverse(nestedMethodsVisitor, { blocks, state });
  return t.classMethod(
    'method',
    t.identifier(name),
    params,
    t.blockStatement(body.body)
  );
}

function replaceThisExpression(path, key, state) {
  if (state.data[key] || state.props[key]) {
    path.replaceWith(
      t.memberExpression(t.thisExpression(), getIdentifier(state, key))
    );
  } else {
    // from computed
    path.parentPath.replaceWith(t.identifier(key));
  }
  path.stop();
}

function createRenderMethod(path, state, name) {
  if (path.node.params.length) {
    log(`
            Maybe you will call $createElement or h method in your render, but react does not support it.
            And it's maybe cause some unknown error in transforming
        `);
  }
  path.traverse({
    ThisExpression(thisPath) {
      const parentNode = thisPath.parentPath.parentPath.parent;
      const isValid =
        t.isExpressionStatement(parentNode) ||
        t.isVariableDeclaration(parentNode) ||
        t.isBlockStatement(parentNode) ||
        t.isJSXElement(parentNode) ||
        t.isCallExpression(parentNode) ||
        (t.isJSXAttribute(parentNode) &&
          !parentNode.name.name.startsWith('on'));

      if (isValid) {
        // prop
        const key = thisPath.parent.property.name;
        replaceThisExpression(thisPath, key, state);
      }
    },
    JSXAttribute(attrPath) {
      const attrNode = attrPath.node;
      if (attrNode.name.name === 'class') {
        attrPath.replaceWith(
          t.jSXAttribute(t.jSXIdentifier('className'), attrNode.value)
        );
      }

      if (attrNode.name.name === 'domPropsInnerHTML') {
        const v = attrNode.value;
        if (t.isLiteral(v)) {
          attrPath.replaceWith(
            t.jSXAttribute(
              t.jSXIdentifier('dangerouslySetInnerHTML'),
              t.jSXExpressionContainer(
                t.objectExpression([
                  t.objectProperty(t.identifier('__html'), attrNode.value)
                ])
              )
            )
          );
        } else if (t.isJSXExpressionContainer(v)) {
          const expression = v.expression;
          if (t.isMemberExpression(expression)) {
            attrPath.traverse({
              ThisExpression(thisPath) {
                const key = thisPath.parent.property.name;
                replaceThisExpression(thisPath, key, state);
              }
            });
          }
          attrPath.replaceWith(
            t.jSXAttribute(
              t.jSXIdentifier('dangerouslySetInnerHTML'),
              t.jSXExpressionContainer(
                t.objectExpression([
                  t.objectProperty(t.identifier('__html'), expression)
                ])
              )
            )
          );
        }
      }
    }
  });
  let blocks = [];

  // computed props
  const computedProps = Object.keys(state.computeds);
  if (computedProps.length) {
    computedProps.forEach(prop => {
      const v = state.computeds[prop];
      blocks = blocks.concat(v['_statements']);
    });
  }
  blocks = blocks.concat(path.node.body.body);
  return t.classMethod(
    'method',
    t.identifier(name),
    [],
    t.blockStatement(blocks)
  );
}

export function handleCycleMethods(
  path,
  collect,
  state,
  name,
  cycleName,
  isSFC
) {
  if (name === 'render') {
    if (isSFC) {
      return;
    }
    collect.classMethods[cycleName] = createRenderMethod(path, state, name);
  } else {
    collect.classMethods[cycleName] = createClassMethod(path, state, cycleName);
  }
}

export function handleGeneralMethods(path, collect, state, name) {
  const methods = createClassMethod(path, state, name);
  collect.classMethods[name] = methods;
  state.classMethods[name] = methods;
}
