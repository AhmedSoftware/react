/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule NativeMethodsMixin
 * @flow
 */
'use strict';

import ReactNativeAttributePayload from 'ReactNativeAttributePayload';
import TextInputState from 'TextInputState';
import UIManager from 'UIManager';

import invariant from 'fbjs/lib/invariant';
import findNodeHandle from 'findNodeHandle';
import findNumericNodeHandle from 'findNumericNodeHandle';

import {
  mountSafeCallback,
  throwOnStylesProp,
  warnForStyleProps,
} from 'NativeMethodsMixinUtils';

import type {
  MeasureInWindowOnSuccessCallback,
  MeasureLayoutOnSuccessCallback,
  MeasureOnSuccessCallback,
  NativeMethodsMixinType,
} from 'ReactNativeTypes';
import type {
  ReactNativeBaseComponentViewConfig,
} from 'ReactNativeViewConfigRegistry';

/**
 * `NativeMethodsMixin` provides methods to access the underlying native
 * component directly. This can be useful in cases when you want to focus
 * a view or measure its on-screen dimensions, for example.
 *
 * The methods described here are available on most of the default components
 * provided by React Native. Note, however, that they are *not* available on
 * composite components that aren't directly backed by a native view. This will
 * generally include most components that you define in your own app. For more
 * information, see [Direct
 * Manipulation](docs/direct-manipulation.html).
 *
 * Note the Flow $Exact<> syntax is required to support mixins.
 * React createClass mixins can only be used with exact types.
 */
const NativeMethodsMixin: $Exact<NativeMethodsMixinType> = {
  /**
   * Determines the location on screen, width, and height of the given view and
   * returns the values via an async callback. If successful, the callback will
   * be called with the following arguments:
   *
   *  - x
   *  - y
   *  - width
   *  - height
   *  - pageX
   *  - pageY
   *
   * Note that these measurements are not available until after the rendering
   * has been completed in native. If you need the measurements as soon as
   * possible, consider using the [`onLayout`
   * prop](docs/view.html#onlayout) instead.
   */
  measure: function(callback: MeasureOnSuccessCallback) {
    UIManager.measure(
      findNumericNodeHandle(this),
      mountSafeCallback(this, callback),
    );
  },

  /**
   * Determines the location of the given view in the window and returns the
   * values via an async callback. If the React root view is embedded in
   * another native view, this will give you the absolute coordinates. If
   * successful, the callback will be called with the following
   * arguments:
   *
   *  - x
   *  - y
   *  - width
   *  - height
   *
   * Note that these measurements are not available until after the rendering
   * has been completed in native.
   */
  measureInWindow: function(callback: MeasureInWindowOnSuccessCallback) {
    UIManager.measureInWindow(
      findNumericNodeHandle(this),
      mountSafeCallback(this, callback),
    );
  },

  /**
   * Like [`measure()`](#measure), but measures the view relative an ancestor,
   * specified as `relativeToNativeNode`. This means that the returned x, y
   * are relative to the origin x, y of the ancestor view.
   *
   * As always, to obtain a native node handle for a component, you can use
   * `findNumericNodeHandle(component)`.
   */
  measureLayout: function(
    relativeToNativeNode: number,
    onSuccess: MeasureLayoutOnSuccessCallback,
    onFail: () => void /* currently unused */,
  ) {
    UIManager.measureLayout(
      findNumericNodeHandle(this),
      relativeToNativeNode,
      mountSafeCallback(this, onFail),
      mountSafeCallback(this, onSuccess),
    );
  },

  /**
   * This function sends props straight to native. They will not participate in
   * future diff process - this means that if you do not include them in the
   * next render, they will remain active (see [Direct
   * Manipulation](docs/direct-manipulation.html)).
   */
  setNativeProps: function(nativeProps: Object) {
    // Class components don't have viewConfig -> validateAttributes.
    // Nor does it make sense to set native props on a non-native component.
    // Instead, find the nearest host component and set props on it.
    // Use findNodeHandle() rather than findNumericNodeHandle() because
    // We want the instance/wrapper (not the native tag).
    let maybeInstance;

    // Fiber errors if findNodeHandle is called for an umounted component.
    // Tests using ReactTestRenderer will trigger this case indirectly.
    // Mimicking stack behavior, we should silently ignore this case.
    // TODO Fix ReactTestRenderer so we can remove this try/catch.
    try {
      maybeInstance = findNodeHandle(this);
    } catch (error) {}

    // If there is no host component beneath this we should fail silently.
    // This is not an error; it could mean a class component rendered null.
    if (maybeInstance == null) {
      return;
    }

    const viewConfig: ReactNativeBaseComponentViewConfig =
      maybeInstance.viewConfig;

    if (__DEV__) {
      warnForStyleProps(nativeProps, viewConfig.validAttributes);
    }

    const updatePayload = ReactNativeAttributePayload.create(
      nativeProps,
      viewConfig.validAttributes,
    );

    // Avoid the overhead of bridge calls if there's no update.
    // This is an expensive no-op for Android, and causes an unnecessary
    // view invalidation for certain components (eg RCTTextInput) on iOS.
    if (updatePayload != null) {
      UIManager.updateView(
        maybeInstance._nativeTag,
        viewConfig.uiViewClassName,
        updatePayload,
      );
    }
  },

  /**
   * Requests focus for the given input or view. The exact behavior triggered
   * will depend on the platform and type of view.
   */
  focus: function() {
    TextInputState.focusTextInput(findNumericNodeHandle(this));
  },

  /**
   * Removes focus from an input or view. This is the opposite of `focus()`.
   */
  blur: function() {
    TextInputState.blurTextInput(findNumericNodeHandle(this));
  },
};

if (__DEV__) {
  // hide this from Flow since we can't define these properties outside of
  // __DEV__ without actually implementing them (setting them to undefined
  // isn't allowed by ReactClass)
  const NativeMethodsMixin_DEV = (NativeMethodsMixin: any);
  invariant(
    !NativeMethodsMixin_DEV.componentWillMount &&
      !NativeMethodsMixin_DEV.componentWillReceiveProps,
    'Do not override existing functions.',
  );
  NativeMethodsMixin_DEV.componentWillMount = function() {
    throwOnStylesProp(this, this.props);
  };
  NativeMethodsMixin_DEV.componentWillReceiveProps = function(newProps) {
    throwOnStylesProp(this, newProps);
  };
}

export default NativeMethodsMixin;
