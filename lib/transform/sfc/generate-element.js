"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateOneEle = generateOneEle;
exports.generateIfState = generateIfState;
exports.generateJSXElement = generateJSXElement;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var t = _interopRequireWildcard(require("@babel/types"));

var _utils = require("../utils");

var _directives = require("./directives");

// class => className
function solveClass(attrs, state) {
  var _attrs = [];
  var hasClass = attrs.some(function (_ref) {
    var key = _ref.key;
    return key === 'class';
  });
  var hasVclass = attrs.some(function (_ref2) {
    var key = _ref2.key;
    return key === 'v-bind:class';
  });
  var varible = t.JSXIdentifier('className');
  var attrVal;

  if (hasClass && hasVclass) {
    // 模板字符串
    var classItem = attrs.find(function (o) {
      return o.key === 'class';
    });
    var vClassItem = attrs.find(function (o) {
      return o.key === 'v-bind:class';
    });
    attrVal = t.templateLiteral([t.templateElement({
      raw: '',
      cooked: ''
    }), t.templateElement({
      raw: ' ',
      cooked: ' '
    }), t.templateElement({
      raw: '',
      cooked: ''
    }, true)], [t.memberExpression(t.identifier('styles'), t.stringLiteral(classItem.value), true), (0, _directives.handleExpression)(state, vClassItem.value)]);
  } else if (hasClass) {
    var _attrs$find = attrs.find(function (o) {
      return o.key === 'class';
    }),
        value = _attrs$find.value;

    attrVal = t.memberExpression(t.identifier('styles'), t.stringLiteral(value), true);
  } else if (hasVclass) {
    var _attrs$find2 = attrs.find(function (o) {
      return o.key === 'v-bind:class';
    }),
        _value = _attrs$find2.value;

    attrVal = (0, _directives.handleExpression)(state, _value);
  }

  if (hasClass || hasVclass) {
    _attrs.push(t.jsxAttribute(varible, t.jSXExpressionContainer(attrVal)));

    return [attrs.filter(function (_ref3) {
      var key = _ref3.key;
      return key !== 'class' && key !== 'v-bind:class';
    }), _attrs];
  } else {
    return [attrs, _attrs];
  }
}
/**
 * 属性赋值
 * @param {*} attrList
 */


function handleAttrValue(attrList, state, child) {
  var _solveClass = solveClass(attrList, state),
      _solveClass2 = (0, _slicedToArray2["default"])(_solveClass, 2),
      attrs = _solveClass2[0],
      _attrs = _solveClass2[1]; // 处理class属性


  var hasforCycle = attrs.some(function (_ref4) {
    var key = _ref4.key;
    return key === 'v-for';
  });
  attrs.map(function (_ref5) {
    var key = _ref5.key,
        value = _ref5.value;

    // 元素添加属性
    if (key === 'v-show' || key === 'v-for') {//不处理 在父组件处理 { exp && <dom/> } { data.map() }
    } else if (key.indexOf('v-on:') > -1) {
      // 暂不处理事件修饰符
      // .stop
      // .prevent
      // .capture
      // .self
      // .once
      // .passive
      var varible = t.JSXIdentifier((0, _directives.handleOnDirective)(key));
      var attrVal = (0, _directives.handleAttribution)(state, value);

      _attrs.push(t.jsxAttribute(varible, attrVal));
    } else if (key.indexOf('v-bind:') > -1) {
      var keys = key.replace('v-bind:', '').split('.');

      var _varible2 = t.JSXIdentifier(keys[0]);

      var _attrVal = t.jSXExpressionContainer((0, _directives.handleExpression)(state, value));

      if (hasforCycle && key === 'v-bind:key') {
        _attrVal = t.jSXExpressionContainer(t.identifier(value));
      }

      _attrs.push(t.jsxAttribute(_varible2, _attrVal));

      if (keys.length && keys[1] === 'sync') {
        // v-bind:attr.sync = xxx>  // 双向绑定的特殊情况
        // v-bind:attr=xxx	v-on:emiterName  ==> emiterName={(new) => this.setState({xxx:new})
        var _var = t.JSXIdentifier((0, _utils.camelName)("update:".concat(keys[0]), ':'));

        var _varible = t.identifier('_new');

        var _block = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('setState')), [t.objectExpression([t.objectProperty(t.identifier(keys[0]), _varible)])]);

        var _val = t.jSXExpressionContainer(t.arrowFunctionExpression([_varible], _block));

        _attrs.push(t.jsxAttribute(_var, _val));
      }
    } else if (key === 'v-text') {
      var content = t.jsxExpressionContainer((0, _directives.handleExpression)(state, value));
      child.push(content);
    } else if (key === 'v-html') {
      var _varible3 = t.jSXIdentifier('dangerouslySetInnerHTML');

      var _attrVal2 = t.jSXExpressionContainer(t.objectExpression([t.objectProperty(t.identifier('__html'), (0, _directives.handleExpression)(state, value))]));

      _attrs.push(t.jsxAttribute(_varible3, _attrVal2));
    } else if (key === 'ref') {
      // ref='dom' => ref={dom => this.dom = dom}
      state.$refs[value] = true;

      var _varible4 = t.JSXIdentifier(key);

      var left = t.memberExpression(t.thisExpression(), t.identifier(value));
      var right = t.identifier('_dom');

      var _attrVal3 = t.jsxExpressionContainer(t.arrowFunctionExpression([t.identifier('_dom')], t.assignmentExpression('=', left, right)));

      _attrs.push(t.jsxAttribute(_varible4, _attrVal3));
    } else {
      _attrs.push(t.jsxAttribute(t.JSXIdentifier(key), t.stringLiteral(value)));
    }
  });
  return _attrs;
}
/* 生成一个标签并添加静态属性 */


function generateOneEle(ast, state) {
  var attrs = ast.attrsList;
  var isVif = !!ast.ifConditions && ast.ifConditions[0].exp;
  var vShowItem = attrs.find(function (o) {
    return o.key === 'v-show';
  });
  var vForItem = attrs.find(function (o) {
    return o.key === 'v-for';
  });
  var child = [];

  if (ast.tag === 'slot') {
    // 处理slot标签
    var slotName = ast.attrsMap.name;

    var _child = t.jSXExpressionContainer(t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('props')), t.identifier(slotName ? slotName : 'children')));

    _child.dom = null;
    return _child;
  }

  var openingElement = t.jsxOpeningElement(t.JSXIdentifier((0, _utils.parseName)(ast.tag)), handleAttrValue(attrs, state, child), false);
  var closeElement = t.jsxClosingElement(t.JSXIdentifier((0, _utils.parseName)(ast.tag)));
  var dom = t.jsxElement(openingElement, closeElement, child);

  if (vForItem && (isVif || vShowItem)) {
    //v-for、  v-if|v-show同时存在
    var exp = isVif && vShowItem ? "".concat(isVif && vShowItem.value) : isVif ? isVif : vShowItem.value;

    var _child2 = (0, _directives.handleForDirective)(vForItem.value, dom, state, exp);

    _child2.dom = dom;
    return _child2;
  } else {
    if (vForItem) {
      // v-for="(value, index) in list" 处理为map
      var _child3 = (0, _directives.handleForDirective)(vForItem.value, dom, state);

      _child3.dom = dom;
      return _child3;
    } else if (vShowItem) {
      var _child4 = null;

      if (!ast.parent) {
        // v-show 处理为if return
        var body = t.blockStatement([t.returnStatement(dom)]);
        _child4 = t.ifStatement((0, _directives.handleExpression)(state, vShowItem.value), body);
      } else {
        // v-show 特殊处理为{condotion && <dom/>}
        _child4 = t.jSXExpressionContainer(t.logicalExpression('&&', (0, _directives.handleExpression)(state, vShowItem.value), dom));
      }

      _child4.dom = dom;
      return _child4;
    }
  }

  return dom;
}
/**
 * 生成 if statement 递归ast结构
 * @param {*} origin :[]
 * @param {*} state
 * @param {*} i
 */


function generateIfState(origin, state) {
  var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var cur = origin[i];
  if (!origin[i]) return null;
  var exp = cur.exp,
      block = cur.block;
  var body = t.blockStatement([t.returnStatement(generateJSXElement(block, null, state, true))]);

  if (!exp) {
    var alter = t.blockStatement([t.returnStatement(generateJSXElement(block, null, state, true))]);
    return alter;
  }

  return t.ifStatement((0, _directives.handleExpression)(state, exp), body, generateIfState(origin, state, ++i));
}
/**
 * 生成 三元表达式 expression 递归ast结构
 * @param {*} origin :[]
 * @param {*} state
 * @param {*} i
 */


function generateConditionalExpression(origin, state) {
  var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var cur = origin[i];
  var exp = cur.exp,
      block = cur.block;

  if (!exp || !origin[i + 1]) {
    return generateJSXElement(block, null, state, true);
  }

  return t.conditionalExpression((0, _directives.handleExpression)(state, exp), generateJSXElement(block, null, state, true), generateConditionalExpression(origin, state, ++i));
}
/**
 * 根据数据长度生成表达式
 * @param {Array} origin
 *    length : 1 { condition && <dom /> }
 *    length : 2 { condition ? <dom /> : <dom />}
 *    length > 2 新增const condition = () { generateIfState }
 * @param {Object} state
 */


function generateConditionEle(origin, parent, state) {
  var length = origin.length;
  var cur = origin[0];
  var next = origin[1];
  var child = null;

  if (length === 1) {
    var ele = generateJSXElement(cur.block, null, state, true);
    var dom = t.isJSXExpressionContainer(ele) ? ele.dom : ele;
    child = t.jsxExpressionContainer( //JSX表达式容器
    // 转化成逻辑表达式
    t.logicalExpression('&&', (0, _directives.handleExpression)(state, cur.exp), dom));
  } else if (length === 2) {
    child = t.jsxExpressionContainer( // 转化成条件表达式
    t.conditionalExpression((0, _directives.handleExpression)(state, cur.exp), generateJSXElement(cur.block, null, state, true), generateJSXElement(next.block, null, state, true)));
  } else {
    child = t.jSXExpressionContainer(generateConditionalExpression(origin, state));
  }

  return child;
}
/**
 *
 * @param {*} ast
 *      type: 1 => dom节点  2 => expression  3 => text
 *      isNoChild: 无child 针对if条件语句 block会无线循环
 */


function generateJSXElement(ast, parent, state, isNoChild) {
  var type = ast && ast.type;

  if (type === 1) {
    if (ast.ifConditions && !isNoChild) {
      if (!parent) {
        // 根节点的条件语句使用if(condition) {return <dom/>}
        return generateIfState(ast.ifConditions, state);
      } else {
        // 非根节点的条件语句使用{ condition ?  <dom /> : <dom /> }
        var expression = generateConditionEle(ast.ifConditions, parent, state);
        parent.children.push(expression);
        return parent;
      }
    } else {
      var nextParent = generateOneEle(ast, state);
      if (!parent) parent = nextParent;else parent.children.push(nextParent);

      if (ast.children.length) {
        var next = t.isJSXElement(nextParent) ? nextParent : nextParent.dom;
        ast.children.map(function (o) {
          var isNochild = o.attrsList && o.attrsList.some(function (_ref6) {
            var key = _ref6.key;
            return key === 'v-for';
          }) && (o.attrsList.some(function (_ref7) {
            var key = _ref7.key;
            return key === 'v-show';
          }) || o.ifConditions);
          generateJSXElement(o, next, state, isNochild);
        });
      }
    }
  } else if (type === 2) {
    // expression
    if (parent && parent.children) {
      var tokens = ast.tokens;
      tokens.map(function (o) {
        if (typeof o === 'string') {
          parent.children.push(t.jsxText(o));
        } else if ((0, _typeof2["default"])(o) === 'object' && o['@binding']) {
          var container = t.jsxExpressionContainer((0, _directives.handleExpression)(state, o['@binding']));
          parent.children.push(container);
        }
      });
    }
  } else if (type === 3 && ast.text.trim()) {
    var _nextParent = t.jsxText(ast.text);

    if (!parent) parent = _nextParent;else parent.children.push(_nextParent);
  }

  return parent;
}