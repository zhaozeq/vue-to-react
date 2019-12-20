require('@babel/register');
const resolve = require('path').resolve;
const trans = require('./transform').default;

const input = resolve(process.cwd(), 'demo/demo.vue');
const output = resolve(process.cwd(), 'demo/react');
const options = {
  isTs: true,
  cssModule: true
};
process.options = options;
trans(input, output, { isTs: true });
