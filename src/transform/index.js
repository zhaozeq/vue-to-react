/**
 * @babel/parser通过该模块来解析我们的代码生成AST抽象语法树；
 * @babel/traverse通过该模块对AST节点进行递归遍历；
 * @babel/types通过该模块对具体的AST节点进行进行增、删、改、查；
 * @babel/generator通过该模块可以将修改后的AST生成新的代码；
 */

import {
  existsSync,
  statSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync
} from 'fs';
import rimraf from 'rimraf';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import generate from '@babel/generator';
import { parseComponent } from 'vue-template-compiler';
import {
  isJSXClosingElement,
  isJSXOpeningElement,
  jSXIdentifier
} from '@babel/types';
import { parseName, log, parseComponentName } from './utils';
import transformTS from './ts';
import transfromTemplate from './sfc';
import {
  initProps,
  initData,
  initComputed,
  initComponents
} from './collect-state';

import {
  genImports,
  genConstructor,
  genStaticProps,
  genClassMethods
} from './react-ast-helpers';

import { handleCycleMethods, handleGeneralMethods } from './vue-ast-helpers';

import { genSFCRenderMethod } from './sfc/sfc-ast-helpers';

import outputFile from './output';

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
      decoratorsBeforeExport: true
    }
  ]
];

function getSuffix(lang) {
  switch (lang) {
    case 'stylus':
      return 'styl';
    case 'sass':
      return 'sass';
    case 'less':
      return 'less';
    default:
      return 'css';
  }
}

/**
 * transform
 * @param {string:path} input
 * @param {string:path} output
 * @param {Boolean} isTs
 */
function transform(input, output, isTs = true) {
  const failedList = [];
  if (!existsSync(input)) {
    log('未找到有效转译文件源,请重试');
    process.exit();
  }
  if (statSync(input).isFile()) output = output + '.js';
  if (existsSync(output)) {
    log('当前路径存在同名文件！,请重试');
    process.exit();
  }
  if (statSync(input).isFile()) {
    // 单个文件时
    try {
      solveSingleFile(input, output, { isTs });
    } catch (error) {
      log(`Transform failed!! \n`);
      log(error);
      rimraf.sync(output);
    }
  } else if (statSync(input).isDirectory()) {
    transformDir(
      input,
      output,
      { isTs, extra: /node_modules|\.ts$/ },
      failedList
    );
  }
  if (failedList.length) {
    console.log('\n   Transform failed list:');
    failedList.map(o => log(`   ${o}`));
  } else {
    log(`Transform completed!!`, 'success');
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
    styles: res.styles
  };
}

function transformDir(input, output, options = {}, failedList) {
  const { isTs, extra } = options;
  const reg = new RegExp(extra);
  if (reg.test(input)) return;
  if (existsSync(output)) {
    const files = readdirSync(input);
    files.forEach(file => {
      const from = input + '/' + file;
      const to = output + '/' + file;
      const temp = statSync(from);
      if (reg.test(from)) return;
      if (temp.isDirectory()) {
        transformDir(from, to, { isTs, extra }, failedList);
      } else if (temp.isFile()) {
        try {
          log(`Transforming ${from.replace(process.cwd(), '')}`);
          solveSingleFile(from, to, { isTs });
        } catch (error) {
          log(error);
          failedList.push(from.replace(process.cwd(), ''));
          rimraf.sync(to);
        }
      }
    });
  } else {
    mkdirSync(output);
    transformDir(input, output, { isTs, extra }, failedList);
  }
}

function solveSingleFile(from, to, opt) {
  const state = {
    name: undefined,
    data: {},
    props: {},
    computeds: {},
    components: {},
    classMethods: {},
    $refs: {}, // 存放refs
    vForVars: {} // 存放v-for 中的变量
  };

  // Life-cycle methods relations mapping
  const cycle = {
    created: 'componentWillMount',
    mounted: 'componentDidMount',
    updated: 'componentDidUpdate',
    beforeDestroy: 'componentWillUnmount',
    errorCaptured: 'componentDidCatch',
    render: 'render'
  };

  const collect = {
    imports: [],
    classMethods: {}
  };
  // 读取文件
  const { isTs } = opt;
  const isVue = /\.vue$/.test(from);
  if (!isVue) {
    copyFileSync(from, to);
    return;
  }

  let fileContent = readFileSync(from);
  const component = formatContent(fileContent.toString());

  /* solve styles */

  const styles = component.styles;
  let suffixName = '';
  if (styles && styles[0]) {
    const style = styles[0];
    const route = to.split('/');
    route.pop();
    const cssFileName = route.join('/');
    const suffix = getSuffix(style.attrs.lang);
    suffixName = `index.${suffix}`;
    outputFile(style.content, `${cssFileName}/${suffixName}`, 'css'); // 支持sass less 格式化
  }

  // 解析模块
  let ast = parse(component.js, {
    sourceType: 'module',
    strictMode: false,
    plugins
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
      if (path.node.source && path.node.source.value !== 'vue')
        collect.imports.unshift(path.node);
    },
    ObjectMethod(path) {
      const name = path.node.key.name;
      if (
        path.parentPath.parent.key &&
        path.parentPath.parent.key.name === 'methods'
      ) {
        handleGeneralMethods(path, collect, state, name);
      } else if (cycle[name]) {
        handleCycleMethods(path, collect, state, name, cycle[name], isVue);
      } else {
        if (name === 'data' || state.computeds[name]) {
          return;
        }
        // log(`The ${name} method maybe be not support now`);
      }
    }
  });

  const html =
    component.template && transfromTemplate(component.template, state);
  // // AST for react component
  const tpl = `export default class ${parseName(
    state.name
  )} extends Component {}`;
  const rast = parse(tpl, {
    sourceType: 'module'
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
    }
  });

  // react组件使用
  babelTraverse(rast, {
    ClassMethod(path) {
      if (path.node.key.name === 'render') {
        path.traverse({
          JSXIdentifier(path) {
            if (
              isJSXClosingElement(path.parent) ||
              isJSXOpeningElement(path.parent)
            ) {
              const node = path.node;
              const componentName =
                state.components[node.name] ||
                state.components[parseComponentName(node.name)];
              if (componentName) {
                path.replaceWith(jSXIdentifier(componentName));
                path.stop();
              }
            }
          }
        });
      }
    }
  });

  const { code } = generate(rast, {
    quotes: 'single',
    retainLines: true
  });

  outputFile(
    code,
    to.replace(/(.*).vue$/, (match, o) => o + '.js')
  );
}

export default transform;
