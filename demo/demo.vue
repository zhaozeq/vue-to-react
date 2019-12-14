<template>
  <div class="wrap">
    <div calss="wrap-tit">time: {{ time }}</div>
    <p v-if="error">some error happend</p>
    <p v-else class="name">your msg: {{ msg }}</p>
    <p v-show="msg" class="shown">test v-show</p>
    <p v-on:click="clickMethod">test v-on</p>
    <img v-bind:src="imageSrc" />
    <ul class="test-list">
      <li v-for="(value, index) in list" v-bind:key="index" class="list-item">
        <div>{{ value }}</div>
        <span>{{ msg }}</span>
      </li>
    </ul>
    <input v-model="text" />
    <input type="checkbox" v-model="checked" />
    <span v-text="text"></span>
    <div v-html="html"></div>
    <to-do v-bind:msg="msg" v-bind:list="list"></to-do>
    {{ msg }}
  </div>
</template>

<script>
import ToDo from './todo';
import './your.less';

export default {
  name: 'test-sfc',
  props: {
    msg: {
      type: String,
      default: 'hello, sfc'
    },
    imageSrc: String
  },

  data() {
    const now = Date.now();
    return {
      list: [1, 2, 3],
      html: '<div>1111<span>222</span>333<p>ssssss</p></div>',
      error: false,
      checked:false,
      time: now
    };
  },

  computed: {
    text() {
      console.log('from computed', this.msg);
      return `${this.time}: ${this.html}`;
    }
  },

  components: {
    ToDo
  },

  methods: {
    clickMethod() {
      console.log('click method');
    },

    testMethod() {
      console.log('call test');
    }
  },

  created() {
    const prevTime = this.time;
    this.testMethod();
    const msg = 'this is a test msg';
    this.time = Date.now();
    console.log('mounted', msg, this.time);
  },

  errorCaptured() {
    this.error = true;
    this.time = Date.now();
    console.log('errorCaptured', this.time);
  }
};
</script>

<style scoped lang="stylus">
.wrap {
  background:#f8f8f8;
  .wrap-tit:{
    font-size:14px;
    }
  }
</style>
