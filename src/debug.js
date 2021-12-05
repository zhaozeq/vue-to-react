/* node demo  */
// require('@babel/register');
// const resolve = require('path').resolve;
// const trans = require('./transform').default;

// const input = resolve(process.cwd(), 'demo/demo.vue');
// const output = resolve(process.cwd(), 'demo/react');
// const options = {
//   isTs: true,
//   cssModule: false
// };
// process.options = options;
// trans(input, output, { isTs: true });

/* browser demo  */
require('@babel/register');
const fs = require('fs');
const trans = require('./transform/transform').default;
const resolve = require('path').resolve;
const input = resolve(process.cwd(), 'demo/demo.vue');
const content = fs.readFileSync(input);
const res = trans(content.toString());
console.log(res.jsx)
console.log(res.css)