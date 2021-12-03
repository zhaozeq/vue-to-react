"use strict";

require('@babel/register');

var fs = require('fs');

var trans = require('./transform');

var resolve = require('path').resolve; // const trans = require('./transform').default;


var input = resolve(process.cwd(), 'demo/demo.vue'); // const output = resolve(process.cwd(), 'demo/react');
// const options = {
//   isTs: true,
//   cssModule: false
// };
// process.options = options;
// trans(input, output, { isTs: true });

var content = fs.readFileSync(input);
trans.transformContent(content.toString());