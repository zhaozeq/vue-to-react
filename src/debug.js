require('@babel/register');
const fs = require('fs');
const trans = require('./transform');
const resolve = require('path').resolve;
// const trans = require('./transform').default;

const input = resolve(process.cwd(), 'demo/demo.vue');
// const output = resolve(process.cwd(), 'demo/react');
// const options = {
//   isTs: true,
//   cssModule: false
// };
// process.options = options;
// trans(input, output, { isTs: true });

const content = fs.readFileSync(input);
const res = trans.transformContent(content.toString());
console.log(res.jsx)
console.log(res.css)