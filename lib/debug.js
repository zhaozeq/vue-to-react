"use strict";

require('@babel/register');

var resolve = require('path').resolve;

var trans = require('./transform')["default"];

var input = resolve(process.cwd(), 'demo/demo.vue');
var output = resolve(process.cwd(), 'demo/react');
trans(input, output, false);