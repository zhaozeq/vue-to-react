"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof3 = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.camelName = camelName;
exports.parseName = parseName;
exports.parseComponentName = parseComponentName;
exports.log = log;
exports.getIdentifier = getIdentifier;
exports.getStateOrProp = getStateOrProp;
exports.genPropTypes = genPropTypes;
exports.genDefaultProps = genDefaultProps;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var t = _interopRequireWildcard(require("@babel/types"));

var _chalk = _interopRequireDefault(require("chalk"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof3(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function camelName(name) {
  var split = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '_';
  var val = name.toLowerCase().split(split);
  if (val.length === 1) return name;
  var str = val.reduce(function (prev, next) {
    var nextStr = next[0].toUpperCase() + next.substr(1);
    return prev + nextStr;
  });
  return str;
}

function parseName(name) {
  var split = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '-';
  name = name || 'react-compoennt';
  var val = name.toLowerCase().split(split);
  if (val.length === 1) return name;
  var str = val.reduce(function (prev, next) {
    var nextStr = next[0].toUpperCase() + next.substr(1);
    return prev + nextStr;
  }, '');
  return str;
}

function parseComponentName(str) {
  if (str) {
    var a = str.split('-').map(function (e) {
      return e[0].toUpperCase() + e.substr(1);
    });
    return a.join('');
  }
}

function log(msg) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'error';

  if (type === 'error') {
    return console.log(_chalk["default"].red("   ".concat(msg)));
  }

  console.log(_chalk["default"].green(msg));
}

function getIdentifier(state, key) {
  return state.data[key] ? t.identifier('state') : t.identifier('props');
}

function getStateOrProp(state, key) {
  return state.data[key] ? 'this.state' : 'this.props';
}

function genPropTypes(props) {
  var properties = [];
  var keys = Object.keys(props);

  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    var obj = props[key];
    var identifier = t.identifier(key);
    var val = t.memberExpression(t.identifier('PropTypes'), t.identifier('any'));

    if (obj.type === 'typesOfArray' || obj.type === 'array') {
      if (obj.type === 'typesOfArray') {
        (function () {
          var elements = [];
          obj.value.forEach(function (val) {
            elements.push(t.memberExpression(t.identifier('PropTypes'), t.identifier(val)));
          });
          val = t.callExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOfType')), [t.arrayExpression(elements)]);
        })();
      } else {
        val = obj.required ? t.memberExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('array')), t.identifier('isRequired')) : t.memberExpression(t.identifier('PropTypes'), t.identifier('array'));
      }
    } else if (obj.validator) {
      // 复杂验证会出问题 干掉
      var node = t.callExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOf')), [t.arrayExpression(obj.validator.elements)]);

      if (obj.required) {
        val = t.memberExpression(node, t.identifier('isRequired'));
      } else {
        val = node;
      }
    } else {
      val = obj.required ? t.memberExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier(obj.type)), t.identifier('isRequired')) : t.memberExpression(t.identifier('PropTypes'), t.identifier(obj.type));
    }

    properties.push(t.objectProperty(identifier, val));
  } // Babel does't support to create static class property???


  return t.classProperty(t.identifier('static propTypes'), t.objectExpression(properties), null, []);
}

function genDefaultProps(props) {
  var properties = [];
  var keys = Object.keys(props).filter(function (key) {
    return props[key].value !== undefined;
  });

  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    var obj = props[key];
    var identifier = t.identifier(key);
    var val = null;

    if (obj.type === 'typesOfArray') {
      var type = (0, _typeof2["default"])(obj.defaultValue);

      if (type !== 'undefined') {
        var v = obj.defaultValue;
        val = type === 'number' ? t.numericLiteral(Number(v)) : type === 'string' ? t.stringLiteral(v) : t.booleanLiteral(v);
      } else {
        continue;
      }
    } else if (obj.type === 'array') {
      val = t.arrayExpression(obj.value.elements);
    } else if (obj.type === 'object') {
      val = t.objectExpression(obj.value.properties);
    } else {
      switch ((0, _typeof2["default"])(obj.value)) {
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
  } // Babel does't support to create static class property???


  return t.classProperty(t.identifier('static defaultProps'), t.objectExpression(properties), null, []);
}