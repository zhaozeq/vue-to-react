"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fs = require("fs");

var _rimraf = _interopRequireDefault(require("rimraf"));

var _parser = require("@babel/parser");

var _traverse = _interopRequireDefault(require("@babel/traverse"));

var _generator = _interopRequireDefault(require("@babel/generator"));

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
 * @param {Boolean} isTs
 */


function transform(input, output) {
  var isTs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  var failedList = [];

  if (!(0, _fs.existsSync)(input)) {
    (0, _utils.log)('未找到有效转译文件源,请重试');
    process.exit();
  }

  if ((0, _fs.statSync)(input).isFile()) output = output + '.js';

  if ((0, _fs.existsSync)(output)) {
    (0, _utils.log)('当前路径存在同名文件！,请重试'); // process.exit();
  }

  if ((0, _fs.statSync)(input).isFile()) {
    // 单个文件时
    try {
      solveSingleFile(input, output, {
        isTs: isTs
      });
    } catch (error) {
      (0, _utils.log)("   Transform failed!! \n");
      (0, _utils.log)(error);

      _rimraf["default"].sync(output);
    }
  } else if ((0, _fs.statSync)(input).isDirectory()) {
    transformDir(input, output, {
      isTs: isTs,
      extra: /node_modules|\.ts$/
    }, failedList);
  }

  if (failedList.length) {
    console.log('\n   Transform failed list:');
    failedList.map(function (o) {
      return (0, _utils.log)("   ".concat(o));
    });
  } else {
    (0, _utils.log)("   Transform completed!!", 'success');
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
  var reg = new RegExp(extra);
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
        try {
          console.log("Transforming ".concat(from.replace(process.cwd(), '')));
          solveSingleFile(from, to, {
            isTs: isTs
          });
        } catch (error) {
          (0, _utils.log)(error);
          failedList.push(from.replace(process.cwd(), ''));

          _rimraf["default"].sync(to);
        }
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

function solveSingleFile(from, to, opt) {
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

  if (!isVue) {
    (0, _fs.copyFileSync)(from, to);
    return;
  }

  var fileContent = (0, _fs.readFileSync)(from);
  var component = formatContent(fileContent.toString());
  /* solve styles */

  var styles = component.styles;
  var suffixName = '';

  if (styles && styles[0]) {
    var style = styles[0];
    var route = to.split('/');
    route.pop();
    var cssFileName = route.join('/');
    var suffix = getSuffix(style.attrs.lang);
    suffixName = "index.".concat(suffix);
    (0, _output["default"])(style.content, "".concat(cssFileName, "/").concat(suffixName), 'css'); // 支持sass less 格式化
  } // 解析模块


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

  var _generate = (0, _generator["default"])(rast, {
    quotes: 'single',
    retainLines: true
  }),
      code = _generate.code;

  (0, _output["default"])(code, to.replace(/(.*).vue$/, function (match, o) {
    return o + '.js';
  }));
}

var _default = transform;
exports["default"] = _default;