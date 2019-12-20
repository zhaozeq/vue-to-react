# readme

## vue-to-react-tool

### Getting started

```bash
## usage
$ sudo tnpm install vue-to-react-tool -g

## convert
$ convert components/test.vue -o components
$ convert components -o components

## options
Usage: trans [targetPath] [options]
Options:
	-v, --version  output current version
	-o, --output   the output path for react component, default is process.cwd()/react__from__vue
	-i, --ignore   fileName or just RegExp => .ts$,ignoreFile.js,ignoreDir  default: node_modules
	-m, --module   use cssModule(styles.***),default is global mode(\"class-name\")
	-t, --ts       it is a typescript component
	-h, --help     output usage information

### 说明
#### 目前已成功转换:

- [x] v-if、v-else-if、v-else
- [x] v-for
- [x] v-show
- [x] v-bind
v-bind:attr.sync = xxx>  // 双向绑定的特殊情况
	v-bind:attr=xxx
	v-on:emiterName  ==> emiterName={(new) => this.setState({xxx:new})
- [x] v-model:与v-bind:attr.sync 类似, 因为checkbox需要特殊处理，type需要是静态的，否则会当成input处理
- [x] v-on
- [x] v-text <span v-text="msg"></span> =》<span>{{msg}}</span>
- [x] v-html => dangerousHtml
- [x] class => className (考虑class   v-bind:class同时存在的情况)
- [x] data() => this.state
- [x] Props => props
- [x] {{ expression }} =>  { expression } 
- [x]  组件名转驼峰
- [x]   created: 'componentWillMount',
- [x]   mounted: 'componentDidMount',
- [x]   updated: 'componentDidUpdate',
- [x]   beforeDestroy: 'componentWillUnmount',
- [x]   errorCaptured: 'componentDidCatch',
- [x]   template =>  render
- [x]   style => index.(css | stylus | sass | less) (目前考虑)
- [x]  移除ts type功能
- [x] this.$refs
- [x] V-for V-if v-show 已考虑同时存在的情况但是官方并不推荐这种写法哦 [vue风格指南][1]

仍需要处理
- [ ] 事件修饰符：
 * .stop
 * .prevent
 * .capture
 * .self
 * .once
 * .passive
- [ ] v-on:attr = handle  => v-on 指令表达式 暂不支持 模板字符串的情况
- [ ] v-bind.sync="doc" => 暂不支持用对象设置多个props
- [ ] watch
- [ ] vue 自带组件如 transition
- [ ] Vux / vue-router(目前需求是组件、模块的转换，无需，看后续需求在考虑)
- [ ] 。。。

目前是对我们的一个vue组件库进行转换，不过实际的代码情况会更加复杂，开发同学的编码习惯差别也很大，还需要针对各种情况详细处理。同时此方案也可以运用于小程序代码互转等场景中，所以我认为学写一下还是不错的，对代码编译的过程能更加深入了解


[1]: https://cn.vuejs.org/v2/style-guide/
