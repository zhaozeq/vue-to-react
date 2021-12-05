"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = transform;

var _vueTemplateCompiler = require("vue-template-compiler");

var _parser = require("@babel/parser");

var _traverse = _interopRequireDefault(require("@babel/traverse"));

var _types = require("@babel/types");

var _generator = _interopRequireDefault(require("@babel/generator"));

var _prettier = require("prettier");

var _ts = _interopRequireDefault(require("./ts"));

var _sfc = _interopRequireDefault(require("./sfc"));

var _utils = require("./utils");

var _collectState = require("./collect-state");

var _vueAstHelpers = require("./vue-ast-helpers");

var _sfcAstHelpers = require("./sfc/sfc-ast-helpers");

var _reactAstHelpers = require("./react-ast-helpers");

var plugins = ['typescript', 'jsx', 'classProperties', 'trailingFunctionCommas', 'asyncFunctions', 'exponentiationOperator', 'asyncGenerators', 'objectRestSpread', ['decorators', {
  decoratorsBeforeExport: true
}]];
/**
 * transform
 * @param {string} content
 * @param {*} opts {isTs:源文件是否使用ts, isUseCssModule:是否使用模块化css}
 * @returns {jsx:string, css:string}
 */

function transform(fileContent, opt) {
  var _ref = opt || {},
      _ref$isTs = _ref.isTs,
      isTs = _ref$isTs === void 0 ? false : _ref$isTs,
      _ref$isUseCssModule = _ref.isUseCssModule,
      isUseCssModule = _ref$isUseCssModule === void 0 ? true : _ref$isUseCssModule;

  var state = {
    name: undefined,
    data: {},
    props: {},
    computeds: {},
    components: {},
    classMethods: {},
    $refs: {},
    // 存放refs
    vForVars: {} // 存放v-for 中的变量

  }; // Life-cycle methods relations mapping

  var cycle = {
    created: 'componentWillMount',
    mounted: 'componentDidMount',
    updated: 'componentDidUpdate',
    beforeDestroy: 'componentWillUnmount',
    errorCaptured: 'componentDidCatch',
    render: 'render'
  };
  var collect = {
    imports: [],
    classMethods: {}
  }; // 读取文件

  var component = formatContent(fileContent);
  var result = {
    jsx: '',
    css: ''
  };
  /* solve styles */

  var styles = component.styles;
  var suffixName = null;

  if (isUseCssModule && styles && styles[0]) {
    var style = styles[0];
    result.css = style.content;
  }

  try {
    // 解析模块
    var ast = (0, _parser.parse)(component.js, {
      sourceType: 'module',
      strictMode: false,
      plugins: plugins
    });

    if (isTs) {
      (0, _ts["default"])(ast);
    }

    (0, _collectState.initProps)(ast, state);
    (0, _collectState.initData)(ast, state);
    (0, _collectState.initComputed)(ast, state);
    (0, _collectState.initComponents)(ast, state); // SFC

    (0, _traverse["default"])(ast, {
      ImportDeclaration: function ImportDeclaration(path) {
        if (path.node.source && path.node.source.value !== 'vue') collect.imports.unshift(path.node);
      },
      ObjectMethod: function ObjectMethod(path) {
        var name = path.node.key.name;

        if (path.parentPath.parent.key && path.parentPath.parent.key.name === 'methods') {
          (0, _vueAstHelpers.handleGeneralMethods)(path, collect, state, name);
        } else if (cycle[name]) {
          (0, _vueAstHelpers.handleCycleMethods)(path, collect, state, name, cycle[name], true);
        } else {
          if (name === 'data' || state.computeds[name]) {
            return;
          } // log(`The ${name} method maybe be not support now`);

        }
      }
    });
    var html = component.template && (0, _sfc["default"])(component.template, state); // // AST for react component

    var tpl = "export default class ".concat((0, _utils.parseName)(state.name), " extends Component {}");
    var rast = (0, _parser.parse)(tpl, {
      sourceType: 'module'
    });
    (0, _traverse["default"])(rast, {
      Program: function Program(path) {
        (0, _reactAstHelpers.genImports)(path, collect, suffixName);
      },
      ClassBody: function ClassBody(path) {
        (0, _reactAstHelpers.genConstructor)(path, state);
        (0, _reactAstHelpers.genStaticProps)(path, state);
        (0, _reactAstHelpers.genClassMethods)(path, state);
        (0, _sfcAstHelpers.genSFCRenderMethod)(path, state, html);
      }
    }); // react组件使用

    (0, _traverse["default"])(rast, {
      ClassMethod: function ClassMethod(path) {
        if (path.node.key.name === 'render') {
          path.traverse({
            JSXIdentifier: function JSXIdentifier(path) {
              if ((0, _types.isJSXClosingElement)(path.parent) || (0, _types.isJSXOpeningElement)(path.parent)) {
                var node = path.node;
                var componentName = state.components[node.name] || state.components[(0, _utils.parseComponentName)(node.name)];

                if (componentName) {
                  path.replaceWith((0, _types.jSXIdentifier)(componentName));
                  path.stop();
                }
              }
            }
          });
        }
      }
    });

    var _generate = (0, _generator["default"])(rast, {
      quotes: 'single',
      retainLines: true
    }),
        code = _generate.code;

    result.jsx = (0, _prettier.format)(code, {
      parser: 'babel'
    });
    result.css = (0, _prettier.format)(result.css, {
      parser: 'css'
    });
    return result;
  } catch (error) {
    (0, _utils.log)(error);
  }
}
/**
 * 解析vue文件
 * @param {*} source
 * @returns
 */


function formatContent(source) {
  var res = (0, _vueTemplateCompiler.parseComponent)(source, {
    pad: 'line'
  });
  var jsCode = res.script.content.replace(/\/\/\n/g, '');
  jsCode = jsCode.replace('export default Vue.extend', 'export default ');
  return {
    template: res.template ? res.template.content : null,
    js: jsCode,
    styles: res.styles
  };
}