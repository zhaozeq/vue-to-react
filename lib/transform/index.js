"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transformContent = transformContent;
exports["default"] = void 0;

var _fs = require("fs");

var _rimraf = _interopRequireDefault(require("rimraf"));

var _parser = require("@babel/parser");

var _traverse = _interopRequireDefault(require("@babel/traverse"));

var _generator = _interopRequireDefault(require("@babel/generator"));

var _prettier = require("prettier");

var _vueTemplateCompiler = require("vue-template-compiler");

var _types = require("@babel/types");

var _utils = require("./utils");

var _ts = _interopRequireDefault(require("./ts"));

var _sfc = _interopRequireDefault(require("./sfc"));

var _collectState = require("./collect-state");

var _reactAstHelpers = require("./react-ast-helpers");

var _vueAstHelpers = require("./vue-ast-helpers");

var _sfcAstHelpers = require("./sfc/sfc-ast-helpers");

var _output = _interopRequireDefault(require("./output"));

/**
 * @babel/parser通过该模块来解析我们的代码生成AST抽象语法树；
 * @babel/traverse通过该模块对AST节点进行递归遍历；
 * @babel/types通过该模块对具体的AST节点进行进行增、删、改、查；
 * @babel/generator通过该模块可以将修改后的AST生成新的代码；
 */
var plugins = ['typescript', 'jsx', 'classProperties', 'trailingFunctionCommas', 'asyncFunctions', 'exponentiationOperator', 'asyncGenerators', 'objectRestSpread', ['decorators', {
  decoratorsBeforeExport: true
}]];

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
 * @param {json} options
 */


function transform(input, output, options) {
  var failedList = [];
  var isTs = options.isTs,
      extra = options.extra;

  if (!(0, _fs.existsSync)(input)) {
    (0, _utils.log)('未找到有效转译文件源,请重试');
    process.exit();
  }

  if ((0, _fs.statSync)(input).isFile()) output = output + '.js'; // if (existsSync(output)) {
  //   log('当前路径存在同名文件！,请重试');
  //   process.exit();
  // }

  if ((0, _fs.statSync)(input).isFile()) {
    // 单个文件时
    solveSingleFile(input, output, {
      isTs: isTs
    }, failedList);
  } else if ((0, _fs.statSync)(input).isDirectory()) {
    transformDir(input, output, {
      isTs: isTs,
      extra: extra.concat('node_modules')
    }, failedList);
  }

  if (failedList.length) {
    console.log('\n   Transform failed list:');
    failedList.map(function (o) {
      return (0, _utils.log)("   ".concat(o));
    });
  } else {
    (0, _utils.log)("\n   Transform completed!!\n", 'success');
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

function transformDir(input, output) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var failedList = arguments.length > 3 ? arguments[3] : undefined;
  var isTs = options.isTs,
      extra = options.extra;
  var reg = new RegExp(extra.join('|'));
  if (reg.test(input)) return;

  if ((0, _fs.existsSync)(output)) {
    var files = (0, _fs.readdirSync)(input);
    files.forEach(function (file) {
      var from = input + '/' + file;
      var to = output + '/' + file;
      var temp = (0, _fs.statSync)(from);
      if (reg.test(from)) return;

      if (temp.isDirectory()) {
        transformDir(from, to, {
          isTs: isTs,
          extra: extra
        }, failedList);
      } else if (temp.isFile()) {
        console.log("   Transforming ".concat(from.replace(process.cwd(), '')));
        solveSingleFile(from, to, {
          isTs: isTs
        }, failedList);
      }
    });
  } else {
    (0, _fs.mkdirSync)(output);
    transformDir(input, output, {
      isTs: isTs,
      extra: extra
    }, failedList);
  }
}

function solveSingleFile(from, to, opt, failedList) {
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

  var isTs = opt.isTs;
  var isVue = /\.vue$/.test(from);
  var isTsFile = /\.ts$/.test(from);

  if (!isVue) {
    if (isTsFile && isTs) {
      // 处理 ts或者js文件 去除type
      var ast = (0, _parser.parse)((0, _fs.readFileSync)(from).toString(), {
        sourceType: 'module',
        strictMode: false,
        plugins: plugins
      });
      (0, _ts["default"])(ast);

      var _generate = (0, _generator["default"])(ast, {
        quotes: 'single',
        retainLines: true
      }),
          code = _generate.code;

      (0, _output["default"])(code, to.replace(/(.*).ts$/, function (match, o) {
        return o + '.js';
      }));
      return;
    } else {
      (0, _fs.copyFileSync)(from, to);
      return;
    }
  }

  var fileContent = (0, _fs.readFileSync)(from);
  var component = formatContent(fileContent.toString());
  /* solve styles */

  var styles = component.styles;
  var suffixName = null;
  var cssRoute = null;
  var isUseCssModule = process.options.cssModule;

  if (isUseCssModule && styles && styles[0]) {
    var style = styles[0];
    var route = to.split('/');
    route.pop();
    var cssFileName = route.join('/');
    var suffix = getSuffix(style.attrs.lang);
    suffixName = "index.".concat(suffix);
    cssRoute = "".concat(cssFileName, "/").concat(suffixName);
    (0, _output["default"])(style.content, cssRoute, 'css'); // 支持sass less 格式化
  }

  try {
    // 解析模块
    var _ast = (0, _parser.parse)(component.js, {
      sourceType: 'module',
      strictMode: false,
      plugins: plugins
    });

    if (isTs) {
      (0, _ts["default"])(_ast);
    }

    (0, _collectState.initProps)(_ast, state);
    (0, _collectState.initData)(_ast, state);
    (0, _collectState.initComputed)(_ast, state);
    (0, _collectState.initComponents)(_ast, state); // SFC

    (0, _traverse["default"])(_ast, {
      ImportDeclaration: function ImportDeclaration(path) {
        if (path.node.source && path.node.source.value !== 'vue') collect.imports.unshift(path.node);
      },
      ObjectMethod: function ObjectMethod(path) {
        var name = path.node.key.name;

        if (path.parentPath.parent.key && path.parentPath.parent.key.name === 'methods') {
          (0, _vueAstHelpers.handleGeneralMethods)(path, collect, state, name);
        } else if (cycle[name]) {
          (0, _vueAstHelpers.handleCycleMethods)(path, collect, state, name, cycle[name], isVue);
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

    var _generate2 = (0, _generator["default"])(rast, {
      quotes: 'single',
      retainLines: true
    }),
        _code = _generate2.code;

    (0, _output["default"])(_code, to.replace(/(.*).vue$/, function (match, o) {
      return o + '.js';
    }));
  } catch (error) {
    (0, _utils.log)(error);
    failedList.push(from.replace(process.cwd(), ''));

    _rimraf["default"].sync(to);

    _rimraf["default"].sync(cssRoute);
  }
}
/**
 * transformContent
 * @param {string} content
 * @param {*} opts {isTs:源文件是否使用ts, isUseCssModule:是否使用模块化css}
 * @returns {jsx:string, css:string}
 */


function transformContent(fileContent, opt) {
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

    var _generate3 = (0, _generator["default"])(rast, {
      quotes: 'single',
      retainLines: true
    }),
        code = _generate3.code;

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

var _default = transform;
exports["default"] = _default;