"use strict";

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

var fs = require('fs');

var trans = require('./transform/transform')["default"];

var resolve = require('path').resolve;

var input = resolve(process.cwd(), 'demo/demo.vue');
var content = fs.readFileSync(input);
var res = trans(content.toString());
console.log(res.jsx);
console.log(res.css);