import * as t from '@babel/types';
import chalk from 'chalk';

export function camelName(name, split = '_') {
  const val = name.toLowerCase().split(split);
  if (val.length === 1) return name;
  const str = val.reduce((prev, next) => {
    const nextStr = next[0].toUpperCase() + next.substr(1);
    return prev + nextStr;
  });
  return str;
}

export function parseName(name, split = '-') {
  name = name || 'react-compoennt';
  const val = name.toLowerCase().split(split);
  if (val.length === 1) return name;
  const str = val.reduce((prev, next) => {
    const nextStr = next[0].toUpperCase() + next.substr(1);
    return prev + nextStr;
  }, '');
  return str;
}

export function parseComponentName(str) {
  if (str) {
    const a = str.split('-').map(e => e[0].toUpperCase() + e.substr(1));
    return a.join('');
  }
}

export function log(msg, type = 'error') {
  if (type === 'error') {
    return console.log(chalk.red(`   ${msg}`));
  }
  console.log(chalk.green(msg));
}

export function getIdentifier(state, key) {
  return state.data[key] ? t.identifier('state') : t.identifier('props');
}

export function getStateOrProp(state, key) {
  return state.data[key] ? 'this.state' : 'this.props';
}

export function genPropTypes(props) {
  const properties = [];
  const keys = Object.keys(props);

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const obj = props[key];
    const identifier = t.identifier(key);

    let val = t.memberExpression(
      t.identifier('PropTypes'),
      t.identifier('any')
    );
    if (obj.type === 'typesOfArray' || obj.type === 'array') {
      if (obj.type === 'typesOfArray') {
        const elements = [];
        obj.value.forEach(val => {
          elements.push(
            t.memberExpression(t.identifier('PropTypes'), t.identifier(val))
          );
        });
        val = t.callExpression(
          t.memberExpression(
            t.identifier('PropTypes'),
            t.identifier('oneOfType')
          ),
          [t.arrayExpression(elements)]
        );
      } else {
        val = obj.required
          ? t.memberExpression(
              t.memberExpression(
                t.identifier('PropTypes'),
                t.identifier('array')
              ),
              t.identifier('isRequired')
            )
          : t.memberExpression(
              t.identifier('PropTypes'),
              t.identifier('array')
            );
      }
    } else if (obj.validator) {
      // 复杂验证会出问题 干掉
      const node = t.callExpression(
        t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOf')),
        [t.arrayExpression(obj.validator.elements)]
      );
      if (obj.required) {
        val = t.memberExpression(node, t.identifier('isRequired'));
      } else {
        val = node;
      }
    } else {
      val = obj.required
        ? t.memberExpression(
            t.memberExpression(
              t.identifier('PropTypes'),
              t.identifier(obj.type)
            ),
            t.identifier('isRequired')
          )
        : t.memberExpression(t.identifier('PropTypes'), t.identifier(obj.type));
    }

    properties.push(t.objectProperty(identifier, val));
  }

  // Babel does't support to create static class property???
  return t.classProperty(
    t.identifier('static propTypes'),
    t.objectExpression(properties),
    null,
    []
  );
}

export function genDefaultProps(props) {
  const properties = [];
  const keys = Object.keys(props).filter(key => props[key].value !== undefined);

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const obj = props[key];
    const identifier = t.identifier(key);

    let val = null;
    if (obj.type === 'typesOfArray') {
      const type = typeof obj.defaultValue;
      if (type !== 'undefined') {
        const v = obj.defaultValue;
        val =
          type === 'number'
            ? t.numericLiteral(Number(v))
            : type === 'string'
            ? t.stringLiteral(v)
            : t.booleanLiteral(v);
      } else {
        continue;
      }
    } else if (obj.type === 'array') {
      val = t.arrayExpression(obj.value.elements);
    } else if (obj.type === 'object') {
      val = t.objectExpression(obj.value.properties);
    } else {
      switch (typeof obj.value) {
        case 'string':
          val = t.stringLiteral(obj.value);
          break;
        case 'boolean':
          val = t.booleanLiteral(obj.value);
          break;
        case 'number':
          val = t.numericLiteral(Number(obj.value));
          break;
        default:
          val = t.stringLiteral(obj.value);
      }
    }

    properties.push(t.objectProperty(identifier, val));
  }

  // Babel does't support to create static class property???
  return t.classProperty(
    t.identifier('static defaultProps'),
    t.objectExpression(properties),
    null,
    []
  );
}
