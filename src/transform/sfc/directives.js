const t = require('babel-types');
const { getIdentifier } = require('../utils');
const eventMap = require('./event-map');

const LOGINCAL_EXPRESSION = ['||', '&&', '??'];
const BINARY_EXPRESSION = [
  '+',
  '-',
  '/',
  '%',
  '*',
  '**',
  '&',
  ',',
  '>>',
  '>>>',
  '<<',
  '^',
  '==',
  '===',
  '!=',
  '!==',
  'in',
  'instanceof',
  '>',
  '<',
  '>=',
  '<='
];

/**
 *  获取变量 可能来自：computed、props、state
 * 'state.a+state.b+a.b.c'=> ["state.a", "state.b", "a.b.c"]
 */
export function handleExpression(state, value) {
  let realVar = '';
  if (value[0] === '{' && value[value.length - 1] === '}') {
    // 本身为对象
    realVar = value.replace(/:(.+?),?/g, word => {
      return word.replace(
        /[a-zA-Z\$_]+(\w+)?((\.[a-zA-Z\$_]+(\w+))+)?/g,
        match => {
          const index = word.indexOf(match);
          const split = match.split('.');
          const _val = split[0];
          if (
            split.length === 1 &&
            ((word[index - 1] === "'" && word[index + match.length] === "'") ||
              (word[index - 1] === '"' && word[index + match.length] === '"'))
          ) {
            // 可能本身就是字符串  '' "" 模板字符串等会有漏洞 那又何妨
            return match;
          } else if (state.$refs[_val]) return `this.${match}`;
          else if (state.data[_val]) return `this.state.${match}`;
          else if (state.computeds[_val] || state.vForVars[_val]) return match;
          else return `this.props.${match}`;
        }
      );
    });
  } else {
    realVar = value.replace(
      /[a-zA-Z\$_]+(\w+)?((\.[a-zA-Z\$_]+(\w+))+)?/g,
      match => {
        const index = value.indexOf(match);
        const split = match.split('.');
        const _val = split[0];
        if (
          split.length === 1 &&
          ((value[index - 1] === "'" && value[index + match.length] === "'") ||
            (value[index - 1] === '"' && value[index + match.length] === '"'))
        ) {
          // 可能本身就是字符串  '' "" 模板字符串等会有漏洞 那又何妨
          return match;
        } else if (state.$refs[_val]) return `this.${match}`;
        else if (state.data[_val]) return `this.state.${match}`;
        else if (state.computeds[_val] || state.vForVars[_val]) return match;
        else return `this.props.${match}`;
      }
    );
  }
  return t.identifier(realVar);
}

/**
 * 处理动态属性值
 * @param {*} state // 搜集state props computes classMethods
 * @param {*} value // 属性字符串值
 */
export function handleAttribution(state, value) {
  let variable = null;
  const key = value.split('.')[0]; // 考虑到value可能是 a.b的形式
  if (state.computeds[key]) {
    variable = t.identifier(value);
  } else if (state.data[key] || state.props[key]) {
    variable = t.memberExpression(
      t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
      t.identifier(value)
    );
  } else if (state.classMethods[key]) {
    variable = t.memberExpression(t.thisExpression(), t.identifier(value));
  } else if (!variable) {
    return t.stringLiteral(value);
  }
  return t.jSXExpressionContainer(variable);
}

/**
 * v-for="(value, index) in list" 处理为map
 * @param {*} value
 * @param {*} dom
 * @param {*} state
 */
export function handleForDirective(value, dom, state, showIfExp) {
  const [left, inOrof, right] = value.split(/\s+?(in|of)\s+?/);
  const [item, index] = left
    .replace('(', '')
    .replace(')', '')
    .split(',');

  state.vForVars[item.trim()] = true;
  state.vForVars[index.trim()] = true;
  const member = handleExpression(state, right.trim());

  const body = !showIfExp
    ? dom
    : t.blockStatement([
        t.ifStatement(
          handleExpression(state, showIfExp),
          t.blockStatement([t.returnStatement(dom)])
        )
      ]);

  const child = t.jSXExpressionContainer(
    t.callExpression(t.memberExpression(member, t.identifier('map')), [
      t.arrowFunctionExpression(
        [t.identifier(item.trim()), t.identifier(index.trim())],
        body
      )
    ])
  );
  return child;
}

export function handleOnDirective(key) {
  const name = key.replace(/^(@|v-on:)/, '').split('.')[0];
  const eventName = eventMap[name];
  if (!eventName) {
    // log(`Not support event name:${name}`);
    return name.replace(/:(\w)/g, (match, letter) => letter.toUpperCase());
  }
  return eventName;
}
