/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

let EnterLeaveEventPlugin;
let EventConstants;
let React;
let ReactDOM;
let ReactDOMComponentTree;

let topLevelTypes;

describe('EnterLeaveEventPlugin', function() {
  beforeEach(function() {
    jest.resetModuleRegistry();

    EnterLeaveEventPlugin = require('EnterLeaveEventPlugin');
    EventConstants = require('EventConstants');
    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMComponentTree = require('ReactDOMComponentTree');

    topLevelTypes = EventConstants.topLevelTypes;
  });

  it('should set relatedTarget properly in iframe', function() {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentDocument;

    iframeDocument.write(
      '<!DOCTYPE html><html><head></head><body><div></div></body></html>'
    );
    iframeDocument.close();

    const component = ReactDOM.render(<div />, iframeDocument.body.getElementsByTagName('div')[0]);
    var div = ReactDOM.findDOMNode(component);

    const extracted = EnterLeaveEventPlugin.extractEvents(
      topLevelTypes.topMouseOver,
      ReactDOMComponentTree.getInstanceFromNode(div),
      {target: div},
      div
    );
    expect(extracted.length).toBe(2);

    const leave = extracted[0];
    const enter = extracted[1];

    expect(leave.target).toBe(iframe.contentWindow);
    expect(leave.relatedTarget).toBe(div);
    expect(enter.target).toBe(div);
    expect(enter.relatedTarget).toBe(iframe.contentWindow);
  });
});
