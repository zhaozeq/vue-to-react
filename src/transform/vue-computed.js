const t = require('babel-types');

const { getIdentifier, log } = require('./utils');

const nestedMethodsVisitor = {
  VariableDeclaration(path) {
    const declarations = path.node.declarations;
    declarations.forEach(d => {
      if (t.isMemberExpression(d.init)) {
        const key = d.init.property.name;
        d.init.object = t.memberExpression(
          t.thisExpression(),
          getIdentifier(this.state, key)
        );
      }
    });
  },
  ExpressionStatement(path) {
    const expression = path.node.expression;
    if (
      t.isCallExpression(expression) &&
      !t.isThisExpression(expression.callee.object)
    ) {
      path.traverse(
        {
          ThisExpression(memPath) {
            const key = memPath.parent.property.name;
            memPath.replaceWith(
              t.memberExpression(
                t.thisExpression(),
                getIdentifier(this.state, key)
              )
            );
            memPath.stop();
          }
        },
        { state: this.state }
      );
    }

    if (t.isAssignmentExpression(expression)) {
      // return log(`Don't do assignment in ${this.key} computed prop`);
    }
  },
  ReturnStatement(path) {
    path.traverse(
      {
        ThisExpression(memPath) {
          const key = memPath.parent.property.name;
          memPath.replaceWith(
            t.memberExpression(
              t.thisExpression(),
              getIdentifier(this.state, key)
            )
          );
          memPath.stop();
        }
      },
      { state: this.state }
    );
  }
};

module.exports = function collectVueComputed(path, state) {
  const childs = path.node.value.properties;
  const parentKey = path.node.key.name; // computed;

  if (childs.length) {
    path.traverse({
      ObjectMethod(propPath) {
        const key = propPath.node.key.name;
        if (!state.computeds[key]) {
          propPath.traverse(nestedMethodsVisitor, { state, key });
          const varNode = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(key),
              t.arrowFunctionExpression(
                propPath.node.params,
                propPath.node.body
              )
            )
          ]);
          state.computeds[key] = {
            _statements: [varNode]
          };
        }
      }
    });
  }
};
