/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule validateNodeNesting
 */

"use strict";

var createObjectFrom = require('createObjectFrom');
var emptyFunction = require('emptyFunction');

var validateNodeNesting = emptyFunction;

if (__DEV__) {
  // The below rules were created from the HTML5 spec and using
  // https://github.com/facebook/xhp/blob/master/php-lib/html.php

  // Flow elements are block or inline elements that can appear in a <div>
  var flow = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi',
    'bdo', 'blockquote', 'br', 'button', 'canvas', 'cite', 'code', 'data',
    'datalist', 'del', 'details', 'dfn', 'div', 'dl', 'em', 'embed',
    'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'hr', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen',
    'label', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav',
    'noscript', 'object', 'ol', 'output', 'p', 'pre', 'progress', 'q', 'ruby',
    's', 'samp', 'script', 'section', 'select', 'small', 'span', 'strong',
    'style', 'sub', 'sup', 'svg', 'table', 'textarea', 'time', 'u', 'ul',
    'var', 'video', 'wbr', '#text'
  ];

  // Phrasing elements are inline elements that can appear in a <span>
  var phrase = [
    'a', 'abbr', 'area', 'audio', 'b', 'bdi', 'bdo', 'br', 'button', 'canvas',
    'cite', 'code', 'data', 'datalist', 'del', 'dfn', 'em', 'embed', 'i',
    'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'link', 'map',
    'mark', 'meta', 'meter', 'noscript', 'object', 'output', 'progress', 'q',
    'ruby', 's', 'samp', 'script', 'select', 'small', 'span', 'strong', 'sub',
    'sup', 'svg', 'textarea', 'time', 'u', 'var', 'video', 'wbr', '#text'
  ];

  // Metadata elements can appear in <head>
  var metadata = [
    'base', 'link', 'meta', 'noscript', 'script', 'style', 'title'
  ];

  // By default, we assume that flow elements can contain other flow elements
  // and phrasing elements can contain other phrasing elements. Here are the
  // exceptions:
  var allowedChildren = {
    'a': flow,
    'audio': ['source', 'track'].concat(flow),
    'body': flow,
    'button': phrase,
    'caption': flow,
    'canvas': flow,
    'colgroup': ['col'],
    'dd': flow,
    'del': flow,
    'details': ['summary'].concat(flow),
    'dl': ['dt', 'dd'],
    'dt': flow,
    'fieldset': flow,
    'figcaption': flow,
    'figure': ['figcaption'].concat(flow),
    'h1': phrase,
    'h2': phrase,
    'h3': phrase,
    'h4': phrase,
    'h5': phrase,
    'h6': phrase,
    'head': metadata,
    'hgroup': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    'html': ['body', 'head'],
    'iframe': [],
    'ins': flow,
    'label': phrase,
    'legend': phrase,
    'li': flow,
    'map': flow,
    'noscript': ['*'],
    'object': ['param'].concat(flow),
    'ol': ['li'],
    'optgroup': ['option'],
    'p': phrase,
    'pre': phrase,
    'rp': phrase,
    'rt': phrase,
    'ruby': ['rp', 'rt', '#text'],
    'script': ['#text'],
    'select': ['option', 'optgroup'],
    'style': ['#text'],
    'summary': phrase,
    'table': ['caption', 'colgroup', 'tbody', 'tfoot', 'thead'],
    'tbody': ['tr'],
    'td': flow,
    'textarea': ['#text'],
    'tfoot': ['tr'],
    'th': flow,
    'thead': ['tr'],
    'title': ['#text'],
    'tr': ['td', 'th'],
    'ul': ['li'],
    'video': ['source', 'track'].concat(flow),

    // SVG
    // TODO: Validate nesting of all svg elements
    'svg': [
      'circle', 'defs', 'g', 'line', 'linearGradient', 'path', 'polygon',
      'polyline', 'radialGradient', 'rect', 'stop', 'text'
    ],

    // Self-closing tags
    'area': [],
    'base': [],
    'br': [],
    'col': [],
    'embed': [],
    'hr': [],
    'img': [],
    'input': [],
    'keygen': [],
    'link': [],
    'menuitem': [],
    'meta': [],
    'param': [],
    'source': [],
    'track': [],
    'wbr': []
  };

  var allowedChildrenMap = {};
  for (var el in allowedChildren) {
    if (allowedChildren.hasOwnProperty(el)) {
      allowedChildrenMap[el] = createObjectFrom(allowedChildren[el]);
    }
  }

  // Fall back to phrasing first because all phrasing elements are flow
  // elements as well
  var phraseMap = createObjectFrom(phrase);
  for (var i = 0, l = phrase.length; i < l; i++) {
    if (!allowedChildrenMap.hasOwnProperty(phrase[i])) {
      allowedChildrenMap[phrase[i]] = phraseMap;
    }
  }

  var flowMap = createObjectFrom(flow);
  for (var i = 0, l = flow.length; i < l; i++) {
    if (!allowedChildrenMap.hasOwnProperty(flow[i])) {
      allowedChildrenMap[flow[i]] = flowMap;
    }
  }

  var nodeCanContainNode = function(parentNodeName, childNodeName) {
    var allowed = allowedChildrenMap[parentNodeName];
    if (allowed == null) {
      return true;
    }


    var result = allowed[childNodeName] || allowed['*'];
    return !!result;
  };

  validateNodeNesting = function(parentNodeName, childNodeName) {
    if (__DEV__) {
      parentNodeName = parentNodeName.toLowerCase();
      childNodeName = childNodeName.toLowerCase();
      if (!nodeCanContainNode(parentNodeName, childNodeName)) {
        var message =
          'validateNodeNesting(...): <' + parentNodeName + '> cannot ' +
          'contain a <' + childNodeName + '> node.';
        if (parentNodeName === 'table' && childNodeName === 'tr') {
          message +=
            ' Add a <tbody> to your code to match the DOM tree generated by ' +
            'the browser.';
        }
        console.warn(message);
      }
    }
  };
}

module.exports = validateNodeNesting;
