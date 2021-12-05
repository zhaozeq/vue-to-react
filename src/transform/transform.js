import { parseComponent } from 'vue-template-compiler';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import { isJSXClosingElement, isJSXOpeningElement, jSXIdentifier } from '@babel/types';
import generate from '@babel/generator';
import { format } from 'prettier';

import transformTS from './ts';
import transfromTemplate from './sfc';
import { parseName, log, parseComponentName } from './utils';
import { initProps, initData, initComputed, initComponents } from './collect-state';
import { handleCycleMethods, handleGeneralMethods } from './vue-ast-helpers';
import { genSFCRenderMethod } from './sfc/sfc-ast-helpers';
import { genImports, genConstructor, genStaticProps, genClassMethods } from './react-ast-helpers';

const plugins = [
  'typescript',
  'jsx',
  'classProperties',
  'trailingFunctionCommas',
  'asyncFunctions',
  'exponentiationOperator',
  'asyncGenerators',
  'objectRestSpread',
  [
    'decorators',
    {
      decoratorsBeforeExport: true,
    },
  ],
];

/**
 * transform
 * @param {string} content
 * @param {*} opts {isTs:源文件是否使用ts, isUseCssModule:是否使用模块化css}
 * @returns {jsx:string, css:string}
 */
export default function transform(fileContent, opt) {
  const { isTs = false, isUseCssModule = true } = opt || {};
  const state = {
    name: undefined,
    data: {},
    props: {},
    computeds: {},
    components: {},
    classMethods: {},
    $refs: {}, // 存放refs
    vForVars: {}, // 存放v-for 中的变量
  };

  // Life-cycle methods relations mapping
  const cycle = {
    created: 'componentWillMount',
    mounted: 'componentDidMount',
    updated: 'componentDidUpdate',
    beforeDestroy: 'componentWillUnmount',
    errorCaptured: 'componentDidCatch',
    render: 'render',
  };

  const collect = {
    imports: [],
    classMethods: {},
  };
  // 读取文件
  const component = formatContent(fileContent);
  const result = { jsx: '', css: '' };
  /* solve styles */
  const styles = component.styles;
  let suffixName = null;
  if (isUseCssModule && styles && styles[0]) {
    const style = styles[0];
    result.css = style.content;
  }

  try {
    // 解析模块
    let ast = parse(component.js, {
      sourceType: 'module',
      strictMode: false,
      plugins,
    });

    if (isTs) {
      transformTS(ast);
    }
    initProps(ast, state);
    initData(ast, state);
    initComputed(ast, state);
    initComponents(ast, state); // SFC
    babelTraverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source && path.node.source.value !== 'vue') collect.imports.unshift(path.node);
      },
      ObjectMethod(path) {
        const name = path.node.key.name;
        if (path.parentPath.parent.key && path.parentPath.parent.key.name === 'methods') {
          handleGeneralMethods(path, collect, state, name);
        } else if (cycle[name]) {
          handleCycleMethods(path, collect, state, name, cycle[name], true);
        } else {
          if (name === 'data' || state.computeds[name]) {
            return;
          }
          // log(`The ${name} method maybe be not support now`);
        }
      },
    });

    const html = component.template && transfromTemplate(component.template, state);
    // // AST for react component
    const tpl = `export default class ${parseName(state.name)} extends Component {}`;
    const rast = parse(tpl, {
      sourceType: 'module',
    });
    babelTraverse(rast, {
      Program(path) {
        genImports(path, collect, suffixName);
      },

      ClassBody(path) {
        genConstructor(path, state);
        genStaticProps(path, state);
        genClassMethods(path, state);
        genSFCRenderMethod(path, state, html);
      },
    });

    // react组件使用
    babelTraverse(rast, {
      ClassMethod(path) {
        if (path.node.key.name === 'render') {
          path.traverse({
            JSXIdentifier(path) {
              if (isJSXClosingElement(path.parent) || isJSXOpeningElement(path.parent)) {
                const node = path.node;
                const componentName = state.components[node.name] || state.components[parseComponentName(node.name)];
                if (componentName) {
                  path.replaceWith(jSXIdentifier(componentName));
                  path.stop();
                }
              }
            },
          });
        }
      },
    });
    const { code } = generate(rast, {
      quotes: 'single',
      retainLines: true,
    });

    result.jsx = format(code, { parser: 'babel' });
    result.css = format(result.css, { parser: 'css' });

    return result;
  } catch (error) {
    log(error);
  }
}

/**
 * 解析vue文件
 * @param {*} source
 * @returns
 */
function formatContent(source) {
  const res = parseComponent(source, { pad: 'line' });
  let jsCode = res.script.content.replace(/\/\/\n/g, '');
  jsCode = jsCode.replace('export default Vue.extend', 'export default ');
  return {
    template: res.template ? res.template.content : null,
    js: jsCode,
    styles: res.styles,
  };
}
