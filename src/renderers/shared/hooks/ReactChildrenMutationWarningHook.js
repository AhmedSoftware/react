/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactChildrenMutationWarningHook
 */

'use strict';

var ReactComponentTreeHook = require('ReactComponentTreeHook');

var warning = require('warning');

var elements = {};

function handleElement(debugID, element) {
  if (element == null) {
    return;
  }
  if (element._shadowChildren === undefined) {
    return;
  }
  if (element._shadowChildren === element.props.children) {
    return;
  }
  var isMutated = false;
  if (Array.isArray(element._shadowChildren)) {
    if (element._shadowChildren.length === element.props.children.length) {
      for (var i = 0; i < element._shadowChildren.length; i++) {
        if (element._shadowChildren[i] !== element.props.children[i]) {
          isMutated = true;
        }
      }
    } else {
      isMutated = true;
    }
  }
  if (!Array.isArray(element._shadowChildren) || isMutated) {
    warning(
      false,
      'Component\'s children should not be mutated.%s',
      ReactComponentTreeHook.getStackAddendumByID(debugID),
    );
  }
}

var ReactDOMUnknownPropertyHook = {
  onBeforeMountComponent(debugID, element) {
    elements[debugID] = element;
  },
  onBeforeUpdateComponent(debugID, element) {
    elements[debugID] = element;
  },
  onComponentHasMounted(debugID) {
    handleElement(debugID, elements[debugID]);
    delete elements[debugID];
  },
  onComponentHasUpdated(debugID) {
    handleElement(debugID, elements[debugID]);
    delete elements[debugID];
  },
};

module.exports = ReactDOMUnknownPropertyHook;
