"use strict";

var t = require('@babel/types');

var chalk = require('chalk');

var _require = require('./utils'),
    log = _require.log;

var nestedPropsVisitor = {
  ObjectProperty: function ObjectProperty(path) {
    var parentKey = path.parentPath.parent.key;

    if (parentKey && parentKey.name === this.childKey) {
      var key = path.node.key;
      var node = path.node.value;

      if (key.name === 'type') {
        if (t.isIdentifier(node)) {
          this.state.props[this.childKey].type = node.name.toLowerCase();
        } else if (t.isArrayExpression(node)) {
          var elements = [];
          node.elements.forEach(function (n) {
            elements.push(n.name.toLowerCase());
          });

          if (!elements.length) {
            log("Providing a type for the ".concat(this.childKey, " prop is a good practice."));
          }
          /**
           * supports following syntax:
           * propKey: { type: [Number, String], default: 0}
           */


          this.state.props[this.childKey].type = elements.length > 1 ? 'typesOfArray' : elements[0] ? elements[0].toLowerCase() : elements;
          this.state.props[this.childKey].value = elements.length > 1 ? elements : elements[0] ? elements[0] : elements;
        } else {
          log("The type in ".concat(this.childKey, " prop only supports identifier or array expression, eg: Boolean, [String]"));
        }
      }

      if (t.isLiteral(node)) {
        if (key.name === 'default') {
          if (this.state.props[this.childKey].type === 'typesOfArray') {
            this.state.props[this.childKey].defaultValue = node.value;
          } else {
            this.state.props[this.childKey].value = node.value;
          }
        }

        if (key.name === 'required') {
          this.state.props[this.childKey].required = node.value;
        }
      }
    }
  },
  ArrowFunctionExpression: function ArrowFunctionExpression(path) {
    var parentKey = path.parentPath.parentPath.parent.key;

    if (parentKey && parentKey.name === this.childKey) {
      var body = path.node.body;

      if (t.isArrayExpression(body)) {
        // Array
        this.state.props[this.childKey].value = body;
      } else if (t.isBlockStatement(body)) {
        // Object/Block array
        var childNodes = body.body;

        if (childNodes.length === 1 && t.isReturnStatement(childNodes[0])) {
          this.state.props[this.childKey].value = childNodes[0].argument;
        }
      } // validator


      if (path.parent.key && path.parent.key.name === 'validator') {
        path.traverse({
          ArrayExpression: function ArrayExpression(path) {
            this.state.props[this.childKey].validator = path.node;
          }
        }, {
          state: this.state,
          childKey: this.childKey
        });
      }
    }
  }
};

module.exports = function collectVueProps(path, state) {
  var childs = path.node.value.properties;
  var parentKey = path.node.key.name; // props;

  if (childs.length) {
    path.traverse({
      ObjectProperty: function ObjectProperty(propPath) {
        var parentNode = propPath.parentPath.parent;

        if (parentNode.key && parentNode.key.name === parentKey) {
          var childNode = propPath.node;
          var childKey = childNode.key.name;
          var childVal = childNode.value;

          if (!state.props[childKey]) {
            if (t.isArrayExpression(childVal)) {
              var elements = [];
              childVal.elements.forEach(function (node) {
                elements.push(node.name.toLowerCase());
              });
              state.props[childKey] = {
                type: elements.length > 1 ? 'typesOfArray' : elements[0] ? elements[0].toLowerCase() : elements,
                value: elements.length > 1 ? elements : elements[0] ? elements[0] : elements,
                required: false,
                validator: false
              };
            } else if (t.isObjectExpression(childVal)) {
              state.props[childKey] = {
                type: '',
                value: undefined,
                required: false,
                validator: false
              };
              path.traverse(nestedPropsVisitor, {
                state: state,
                childKey: childKey
              });
            } else if (t.isIdentifier(childVal)) {
              // supports propKey: type
              state.props[childKey] = {
                type: childVal.name.toLowerCase(),
                value: undefined,
                required: false,
                validator: false
              };
            } else {
              log("Not supports expression for the ".concat(this.childKey, " prop in props."));
            }
          }
        }
      }
    });
  }
};