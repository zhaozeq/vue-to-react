import { compile } from 'vue-template-compiler';
import * as t from '@babel/types';
import { generateJSXElement } from './generate-element';

/**
 * 保证名称一致 '@click' => v-on:click  :text => v-bind:text
 * class  ==>  className
 * @param {*} ast
 */
function flatName(ast, isNochild = false) {
  if (ast.ifConditions && ast.ifConditions.length && !isNochild) {
    ast.ifConditions.map(({ block }) => flatName(block, true));
  } else if (ast && ast.type === 1) {
    const attrsList = [];
    const attrObj = ast.attrsMap;
    Object.keys(attrObj).map(o => {
      let key = o;
      if (key === 'v-if' || key === 'v-else-if' || key === 'v-else') return;
      else if (/^:/.test(o)) {
        // 统一成v-bind
        key = o.replace(/^:/, 'v-bind:');
      } else if (/^@/.test(o)) key = o.replace(/^@/, 'v-on:');
      attrsList.push({ key, value: attrObj[o] });
    });
    ast.attrsList = attrsList;
    if (!ast.children) return;
    ast.children.map(o => flatName(o));
  }
}

export default function transfromTemplate(template, state) {
  const ast = compile(template).ast;

  flatName(ast); // 统一name 如：@click => v-on:click

  let argument = generateJSXElement(ast, null, state);
  if (t.isJSXElement(argument)) {
    argument = t.returnStatement(argument);
  }

  return argument;
}
