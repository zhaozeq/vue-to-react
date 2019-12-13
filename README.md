# readme

## vue-to-react-tool

### Getting started

```bash
## usage
$ sudo tnpm install vue-to-react-tool -g

## convert
$ convert components/test.vue -o components
$ convert components -o components

## help
$ convert --help
```

### 说明
#### 目前已成功转换:
- v-if、v-else-if、v-else
- v-for
- v-show
- v-bind
  v-bind:attr.sync = xxx>  // 已考虑双向绑定的特殊情况
- v-model:与v-bind:attr.sync 类似
- v-on
- v-text
- v-html => dangerousHtml
- class => className (已考虑class v-bind:class同时存在的情况)
- data() => this.state
- Props => props
- {{ expression }} =>  { expression } 
-  组件名转驼峰
-  created: 'componentWillMount',
-  mounted: 'componentDidMount',
-  updated: 'componentDidUpdate',
-  beforeDestroy: 'componentWillUnmount',
-  errorCaptured: 'componentDidCatch',
-  template =>  render
-  style => index.(css | stylus | sass | less) (目前考虑)
-  移除ts type功能
- this.$refs
- v-for v-if v-show 同时存在的情况
- 
--------
#### 仍需要处理
- v-on: 事件修饰符：
  * .stop
  * .prevent
  * .capture
  * .self
  * .once
  * .passive
- v-bind.sync="doc" => 暂不支持用对象设置多个props
- watch
- 指令表达式 暂不支持 模板字符串的情况
- Vux / vue-router(目前需求是组件、模块的转换，无需，看后续需求在考虑)
- 。。。

目前是对我们的一个vue组件库进行转换，不过实际的代码情况会更加复杂，开发同学的编码习惯差别也很大，还需要针对各种情况详细处理。同时此方案也可以运用于小程序代码互转等场景中，所以我认为学写一下还是不错的，对代码编译的过程能更加深入了解


