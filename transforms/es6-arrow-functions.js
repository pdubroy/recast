// A transform which replaces ES6 arrow functions with regular ol' JavaScript
// function expressions. Based on https://github.com/square/es6-arrow-function/.
//
// Copyright 2013 Square Inc.
//  
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var types = require('ast-types');
var n = types.namedTypes;
var b = types.builders;

/**
 * Visits a node of an AST looking for arrow function expressions. This is
 * intended to be used with the ast-types `traverse()` function.
 *
 * @param {Object} node
 * @this {ast-types.Path}
 */
function visitNode(node) {
  if (!n.ArrowFunctionExpression.check(node)) {
    return;
  }

  var body;

  if (n.BlockStatement.check(node.body)) {
    body = node.body;
  } else {
    body = b.blockStatement([b.returnStatement(node.body)]);
  }

  var replacement = b.functionExpression(null, node.params, body);
  var foundThisExpression = false;

  types.traverse(node, function(child) {
    // don't look inside non-arrow functions
    if (n.FunctionExpression.check(child)) {
      return false;
    }

    if (n.ThisExpression.check(child)) {
      foundThisExpression = true;
      return false;
    }
  });

  if (foundThisExpression) {
    replacement = b.callExpression(
      b.memberExpression(replacement, b.identifier('bind'), false),
      [b.thisExpression()]
    );
  }

  this.replace(transform(replacement));
}

/**
 * Transform an Esprima AST generated from ES6 by replacing all
 * ArrowFunctionExpression usages with the non-shorthand FunctionExpression.
 * @param {Object} ast
 * @return {Object}
 */
function transform(ast, callback) {
  callback(types.traverse(ast, visitNode));
}

module.exports = transform;
