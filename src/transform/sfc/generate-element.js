import * as t from '@babel/types';
import { parseName, camelName } from '../utils';
import { handleAttribution, handleExpression, handleOnDirective, handleForDirective } from './directives';

// class => className
function solveClass(attrs, state) {
  const _attrs = [];
  const hasClass = attrs.some(({ key }) => key === 'class');
  const hasVclass = attrs.some(({ key }) => key === 'v-bind:class');
  const varible = t.JSXIdentifier('className');
  const isUseCssModule = process.options ? process.options.cssModule : true;
  let attrVal;
  if (hasClass && hasVclass) {
    // 模板字符串
    const classItem = attrs.find(o => o.key === 'class');
    const vClassItem = attrs.find(o => o.key === 'v-bind:class');
    const templateElements = isUseCssModule
      ? [t.templateElement({ raw: '', cooked: '' }), t.templateElement({ raw: ' ', cooked: ' ' }), t.templateElement({ raw: '', cooked: '' }, true)]
      : [
          t.templateElement({
            raw: `${classItem.value} `,
            cooked: `${classItem.value} `,
          }),
          t.templateElement({ raw: '', cooked: '' }, true),
        ];

    const expressions = isUseCssModule
      ? [t.memberExpression(t.identifier('styles'), t.stringLiteral(classItem.value), true), handleExpression(state, vClassItem.value)]
      : [handleExpression(state, vClassItem.value)];

    attrVal = t.jSXExpressionContainer(t.templateLiteral(templateElements, expressions));
  } else if (hasClass) {
    const { value } = attrs.find(o => o.key === 'class');
    attrVal = isUseCssModule
      ? t.jSXExpressionContainer(t.memberExpression(t.identifier('styles'), t.stringLiteral(value), true))
      : t.stringLiteral(value);
  } else if (hasVclass) {
    const { value } = attrs.find(o => o.key === 'v-bind:class');
    attrVal = t.jSXExpressionContainer(handleExpression(state, value));
  }
  if (hasClass || hasVclass) {
    _attrs.push(t.jsxAttribute(varible, attrVal));
    return [attrs.filter(({ key }) => key !== 'class' && key !== 'v-bind:class'), _attrs];
  } else {
    return [attrs, _attrs];
  }
}

/**
 * 属性赋值
 * @param {String} tagName 标签名
 * @param {Array} attrList 属性列表 {k:v}
 */
function handleAttrValue(tagName, attrList, state, child) {
  const [attrs, _attrs] = solveClass(attrList, state); // 处理class属性
  const hasforCycle = attrs.some(({ key }) => key === 'v-for');
  attrs.map(({ key, value }) => {
    // 元素添加属性
    if (key === 'v-show' || key === 'v-for') {
      //不处理 在父组件处理 { exp && <dom/> } { data.map() }
    } else if (key.indexOf('v-on:') > -1) {
      // 暂不处理事件修饰符
      // .stop
      // .prevent
      // .capture
      // .self
      // .once
      // .passive
      const varible = t.JSXIdentifier(handleOnDirective(key));
      const attrVal = handleAttribution(state, value);
      _attrs.push(t.jsxAttribute(varible, attrVal));
    } else if (key.indexOf('v-bind:') > -1) {
      const keys = key.replace('v-bind:', '').split('.');
      const varible = t.JSXIdentifier(keys[0]);
      let attrVal = t.jSXExpressionContainer(handleExpression(state, value));
      if (hasforCycle && key === 'v-bind:key') {
        attrVal = t.jSXExpressionContainer(t.identifier(value));
      }
      _attrs.push(t.jsxAttribute(varible, attrVal));
      if (keys.length && keys[1] === 'sync') {
        // v-bind:attr.sync = xxx>  // 双向绑定的特殊情况
        // v-bind:attr=xxx	v-on:emiterName  ==> emiterName={(new) => this.setState({xxx:new})
        const _var = t.JSXIdentifier(camelName(`update:${keys[0]}`, ':'));
        const _varible = t.identifier('_new');
        const _block = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('setState')), [
          t.objectExpression([t.objectProperty(t.identifier(keys[0]), _varible)]),
        ]);
        const _val = t.jSXExpressionContainer(t.arrowFunctionExpression([_varible], _block));
        _attrs.push(t.jsxAttribute(_var, _val));
      }
    } else if (key === 'v-model') {
      // 改为value = xxx onInput={e => this.setState({xxx:e.target.value|checked})}
      const varible = t.JSXIdentifier('value');
      const attrVal = t.jSXExpressionContainer(
        t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('state')), t.identifier(value))
      );
      _attrs.push(t.jsxAttribute(varible, attrVal));

      // 处理onInput
      const inputKey = t.JSXIdentifier('onInput');
      const _varible =
        tagName === 'input' && attrs.some(({ key, value }) => key === 'type' && value === 'checkbox')
          ? t.identifier('e.target.checked')
          : t.identifier('e.target.value');
      const _block = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('setState')), [
        t.objectExpression([t.objectProperty(t.identifier(value), _varible)]),
      ]);
      const _val = t.jSXExpressionContainer(t.arrowFunctionExpression([t.identifier('e')], _block));
      _attrs.push(t.jsxAttribute(inputKey, _val));
    } else if (key === 'v-text') {
      const content = t.jsxExpressionContainer(handleExpression(state, value));
      child.push(content);
    } else if (key === 'v-html') {
      const varible = t.jSXIdentifier('dangerouslySetInnerHTML');
      const attrVal = t.jSXExpressionContainer(t.objectExpression([t.objectProperty(t.identifier('__html'), handleExpression(state, value))]));
      _attrs.push(t.jsxAttribute(varible, attrVal));
    } else if (key === 'ref') {
      // ref='dom' => ref={dom => this.dom = dom}
      state.$refs[value] = true;
      const varible = t.JSXIdentifier(key);
      const left = t.memberExpression(t.thisExpression(), t.identifier(value));
      const right = t.identifier('_dom');
      const attrVal = t.jsxExpressionContainer(t.arrowFunctionExpression([t.identifier('_dom')], t.assignmentExpression('=', left, right)));
      _attrs.push(t.jsxAttribute(varible, attrVal));
    } else {
      _attrs.push(t.jsxAttribute(t.JSXIdentifier(key), t.stringLiteral(value)));
    }
  });
  return _attrs;
}

/* 生成一个标签并添加静态属性 */
function generateOneEle(ast, state) {
  const attrs = ast.attrsList;
  const isVif = !!ast.ifConditions && ast.ifConditions[0].exp;
  const vShowItem = attrs.find(o => o.key === 'v-show');
  const vForItem = attrs.find(o => o.key === 'v-for');
  const child = [];

  if (ast.tag === 'slot') {
    // 处理slot标签
    const slotName = ast.attrsMap.name;
    const _child = t.jSXExpressionContainer(
      t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('props')), t.identifier(slotName ? slotName : 'children'))
    );
    _child.dom = null;
    return _child;
  }

  const openingElement = t.jsxOpeningElement(t.JSXIdentifier(parseName(ast.tag)), handleAttrValue(ast.tag, attrs, state, child), false);
  const closeElement = t.jsxClosingElement(t.JSXIdentifier(parseName(ast.tag)));
  const dom = t.jsxElement(openingElement, closeElement, child);
  if (vForItem && (isVif || vShowItem)) {
    //v-for、  v-if|v-show同时存在
    const exp = isVif && vShowItem ? `${isVif && vShowItem.value}` : isVif ? isVif : vShowItem.value;
    const _child = handleForDirective(vForItem.value, dom, state, exp);
    _child.dom = dom;
    return _child;
  } else {
    if (vForItem) {
      // v-for="(value, index) in list" 处理为map
      const _child = handleForDirective(vForItem.value, dom, state);
      _child.dom = dom;
      return _child;
    } else if (vShowItem) {
      let _child = null;
      if (!ast.parent) {
        // v-show 处理为if return
        const body = t.blockStatement([t.returnStatement(dom)]);
        _child = t.ifStatement(handleExpression(state, vShowItem.value), body);
      } else {
        // v-show 特殊处理为{condotion && <dom/>}
        _child = t.jSXExpressionContainer(t.logicalExpression('&&', handleExpression(state, vShowItem.value), dom));
      }
      _child.dom = dom;
      return _child;
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
function generateIfState(origin, state, i = 0) {
  const cur = origin[i];
  if (!origin[i]) return null;
  const { exp, block } = cur;
  const body = t.blockStatement([t.returnStatement(generateJSXElement(block, null, state, true))]);
  if (!exp) {
    const alter = t.blockStatement([t.returnStatement(generateJSXElement(block, null, state, true))]);
    return alter;
  }
  return t.ifStatement(handleExpression(state, exp), body, generateIfState(origin, state, ++i));
}

/**
 * 生成 三元表达式 expression 递归ast结构
 * @param {*} origin :[]
 * @param {*} state
 * @param {*} i
 */
function generateConditionalExpression(origin, state, i = 0) {
  const cur = origin[i];
  const { exp, block } = cur;
  if (!exp || !origin[i + 1]) {
    return generateJSXElement(block, null, state, true);
  }
  return t.conditionalExpression(
    handleExpression(state, exp),
    generateJSXElement(block, null, state, true),
    generateConditionalExpression(origin, state, ++i)
  );
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
  const length = origin.length;
  const cur = origin[0];
  const next = origin[1];
  let child = null;
  if (length === 1) {
    const ele = generateJSXElement(cur.block, null, state, true);
    const dom = t.isJSXExpressionContainer(ele) ? ele.dom : ele;
    child = t.jsxExpressionContainer(
      //JSX表达式容器
      // 转化成逻辑表达式
      t.logicalExpression('&&', handleExpression(state, cur.exp), dom)
    );
  } else if (length === 2) {
    child = t.jsxExpressionContainer(
      // 转化成条件表达式
      t.conditionalExpression(
        handleExpression(state, cur.exp),
        generateJSXElement(cur.block, null, state, true),
        generateJSXElement(next.block, null, state, true)
      )
    );
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
  const type = ast && ast.type;
  if (type === 1) {
    if (ast.ifConditions && !isNoChild) {
      if (!parent) {
        // 根节点的条件语句使用if(condition) {return <dom/>}
        return generateIfState(ast.ifConditions, state);
      } else {
        // 非根节点的条件语句使用{ condition ?  <dom /> : <dom /> }
        const expression = generateConditionEle(ast.ifConditions, parent, state);
        parent.children.push(expression);
        return parent;
      }
    } else {
      const nextParent = generateOneEle(ast, state);
      if (!parent) parent = nextParent;
      else parent.children.push(nextParent);
      if (ast.children.length) {
        const next = t.isJSXElement(nextParent) ? nextParent : nextParent.dom;
        ast.children.map(o => {
          const isNochild =
            o.attrsList && o.attrsList.some(({ key }) => key === 'v-for') && (o.attrsList.some(({ key }) => key === 'v-show') || o.ifConditions);
          generateJSXElement(o, next, state, isNochild);
        });
      }
    }
  } else if (type === 2) {
    // expression
    if (parent && parent.children) {
      const tokens = ast.tokens;
      tokens.map(o => {
        if (typeof o === 'string') {
          parent.children.push(t.jsxText(o));
        } else if (typeof o === 'object' && o['@binding']) {
          const container = t.jsxExpressionContainer(handleExpression(state, o['@binding']));
          parent.children.push(container);
        }
      });
    }
  } else if (type === 3 && ast.text.trim()) {
    const nextParent = t.jsxText(ast.text);
    if (!parent) parent = nextParent;
    else parent.children.push(nextParent);
  }
  return parent;
}

export { generateOneEle, generateIfState, generateJSXElement };
