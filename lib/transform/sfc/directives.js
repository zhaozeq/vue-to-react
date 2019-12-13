"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleExpression = handleExpression;
exports.handleAttribution = handleAttribution;
exports.handleForDirective = handleForDirective;
exports.handleOnDirective = handleOnDirective;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var t = require('babel-types');

var _require = require('../utils'),
    getIdentifier = _require.getIdentifier;

var eventMap = require('./event-map');

var LOGINCAL_EXPRESSION = ['||', '&&', '??'];
var BINARY_EXPRESSION = ['+', '-', '/', '%', '*', '**', '&', ',', '>>', '>>>', '<<', '^', '==', '===', '!=', '!==', 'in', 'instanceof', '>', '<', '>=', '<='];
/**
 *  获取变量 可能来自：computed、props、state
 * 'state.a+state.b+a.b.c'=> ["state.a", "state.b", "a.b.c"]
 */

function handleExpression(state, value) {
  var realVar = '';

  if (value[0] === '{' && value[value.length - 1] === '}') {
    // 本身为对象
    realVar = value.replace(/:(.+?),?/g, function (word) {
      return word.replace(/[a-zA-Z\$_]+(\w+)?((\.[a-zA-Z\$_]+(\w+))+)?/g, function (match) {
        var index = word.indexOf(match);
        var split = match.split('.');
        var _val = split[0];

        if (split.length === 1 && (word[index - 1] === "'" && word[index + match.length] === "'" || word[index - 1] === '"' && word[index + match.length] === '"')) {
          // 可能本身就是字符串  '' "" 模板字符串等会有漏洞 那又何妨
          return match;
        } else if (state.$refs[_val]) return "this.".concat(match);else if (state.data[_val]) return "this.state.".concat(match);else if (state.computeds[_val] || state.vForVars[_val]) return match;else return "this.props.".concat(match);
      });
    });
  } else {
    realVar = value.replace(/[a-zA-Z\$_]+(\w+)?((\.[a-zA-Z\$_]+(\w+))+)?/g, function (match) {
      var index = value.indexOf(match);
      var split = match.split('.');
      var _val = split[0];

      if (split.length === 1 && (value[index - 1] === "'" && value[index + match.length] === "'" || value[index - 1] === '"' && value[index + match.length] === '"')) {
        // 可能本身就是字符串  '' "" 模板字符串等会有漏洞 那又何妨
        return match;
      } else if (state.$refs[_val]) return "this.".concat(match);else if (state.data[_val]) return "this.state.".concat(match);else if (state.computeds[_val] || state.vForVars[_val]) return match;else return "this.props.".concat(match);
    });
  }

  return t.identifier(realVar);
}
/**
 * 处理动态属性值
 * @param {*} state // 搜集state props computes classMethods
 * @param {*} value // 属性字符串值
 */


function handleAttribution(state, value) {
  var variable = null;
  var key = value.split('.')[0]; // 考虑到value可能是 a.b的形式

  if (state.computeds[key]) {
    variable = t.identifier(value);
  } else if (state.data[key] || state.props[key]) {
    variable = t.memberExpression(t.memberExpression(t.thisExpression(), getIdentifier(state, value)), t.identifier(value));
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


function handleForDirective(value, dom, state, showIfExp) {
  var _value$split = value.split(/\s+?(in|of)\s+?/),
      _value$split2 = (0, _slicedToArray2["default"])(_value$split, 3),
      left = _value$split2[0],
      inOrof = _value$split2[1],
      right = _value$split2[2];

  var _left$replace$replace = left.replace('(', '').replace(')', '').split(','),
      _left$replace$replace2 = (0, _slicedToArray2["default"])(_left$replace$replace, 2),
      item = _left$replace$replace2[0],
      index = _left$replace$replace2[1];

  state.vForVars[item.trim()] = true;
  state.vForVars[index.trim()] = true;
  var member = handleExpression(state, right.trim());
  var body = !showIfExp ? dom : t.blockStatement([t.ifStatement(handleExpression(state, showIfExp), t.blockStatement([t.returnStatement(dom)]))]);
  var child = t.jSXExpressionContainer(t.callExpression(t.memberExpression(member, t.identifier('map')), [t.arrowFunctionExpression([t.identifier(item.trim()), t.identifier(index.trim())], body)]));
  return child;
}

function handleOnDirective(key) {
  var name = key.replace(/^(@|v-on:)/, '').split('.')[0];
  var eventName = eventMap[name];

  if (!eventName) {
    // log(`Not support event name:${name}`);
    return name.replace(/:(\w)/g, function (match, letter) {
      return letter.toUpperCase();
    });
  }

  return eventName;
}