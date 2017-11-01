/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var ReactTestUtils = require('react-dom/test-utils');
var ReactInputSelection = require('../client/ReactInputSelection');

describe('ReactInputSelection', () => {
  var textValue = 'the text contents';
  var createAndMountElement = (type, props, children) => {
    var element = React.createElement(type, props, children);
    var instance = ReactTestUtils.renderIntoDocument(element);
    return ReactDOM.findDOMNode(instance);
  };
  var makeGetSelection = (win = window) => () => ({
    anchorNode: win.document.activeElement,
    focusNode: win.document.activeElement,
    anchorOffset: win.document.activeElement &&
      win.document.activeElement.selectionStart,
    focusOffset: win.document.activeElement &&
      win.document.activeElement.selectionEnd,
  });

  describe('hasSelectionCapabilities', () => {
    it('returns true for textareas', () => {
      var textarea = document.createElement('textarea');
      expect(ReactInputSelection.hasSelectionCapabilities(textarea)).toBe(true);
    });

    it('returns true for text inputs', () => {
      var inputText = document.createElement('input');
      var inputReadOnly = document.createElement('input');
      inputReadOnly.readOnly = 'true';
      var inputNumber = document.createElement('input');
      inputNumber.type = 'number';
      var inputEmail = document.createElement('input');
      inputEmail.type = 'email';
      var inputPassword = document.createElement('input');
      inputPassword.type = 'password';
      var inputHidden = document.createElement('input');
      inputHidden.type = 'hidden';

      expect(ReactInputSelection.hasSelectionCapabilities(inputText)).toBe(
        true,
      );
      expect(ReactInputSelection.hasSelectionCapabilities(inputReadOnly)).toBe(
        true,
      );
      expect(ReactInputSelection.hasSelectionCapabilities(inputNumber)).toBe(
        false,
      );
      expect(ReactInputSelection.hasSelectionCapabilities(inputEmail)).toBe(
        false,
      );
      expect(ReactInputSelection.hasSelectionCapabilities(inputPassword)).toBe(
        false,
      );
      expect(ReactInputSelection.hasSelectionCapabilities(inputHidden)).toBe(
        false,
      );
    });

    it('returns true for contentEditable elements', () => {
      var div = document.createElement('div');
      div.contentEditable = 'true';
      var body = document.createElement('body');
      body.contentEditable = 'true';
      var input = document.createElement('input');
      input.contentEditable = 'true';
      var select = document.createElement('select');
      select.contentEditable = 'true';

      expect(ReactInputSelection.hasSelectionCapabilities(div)).toBe(true);
      expect(ReactInputSelection.hasSelectionCapabilities(body)).toBe(true);
      expect(ReactInputSelection.hasSelectionCapabilities(input)).toBe(true);
      expect(ReactInputSelection.hasSelectionCapabilities(select)).toBe(true);
    });

    it('returns false for any other type of HTMLElement', () => {
      var select = document.createElement('select');
      var iframe = document.createElement('iframe');

      expect(ReactInputSelection.hasSelectionCapabilities(select)).toBe(false);
      expect(ReactInputSelection.hasSelectionCapabilities(iframe)).toBe(false);
    });
  });

  describe('getSelection', () => {
    it('gets selection offsets from a textarea or input', () => {
      var input = createAndMountElement('input', {defaultValue: textValue});
      input.setSelectionRange(6, 11);
      expect(ReactInputSelection.getSelection(input)).toEqual({
        start: 6,
        end: 11,
      });

      var textarea = createAndMountElement('textarea', {
        defaultValue: textValue,
      });
      textarea.setSelectionRange(6, 11);
      expect(ReactInputSelection.getSelection(textarea)).toEqual({
        start: 6,
        end: 11,
      });
    });

    it('gets selection offsets from a contentEditable element', () => {
      var node = createAndMountElement('div', null, textValue);
      node.selectionStart = 6;
      node.selectionEnd = 11;
      expect(ReactInputSelection.getSelection(node)).toEqual({
        start: 6,
        end: 11,
      });
    });

    it('gets selection offsets as start: 0, end: 0 if no selection', () => {
      var node = createAndMountElement('select');
      expect(ReactInputSelection.getSelection(node)).toEqual({
        start: 0,
        end: 0,
      });
    });

    it('gets selection on inputs in iframes', () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const input = document.createElement('input');
      input.value = textValue;
      iframe.contentDocument.body.appendChild(input);
      input.select();
      expect(input.selectionStart).toEqual(0);
      expect(input.selectionEnd).toEqual(textValue.length);

      document.body.removeChild(iframe);
    });
  });

  describe('setSelection', () => {
    it('sets selection offsets on textareas and inputs', () => {
      var input = createAndMountElement('input', {defaultValue: textValue});
      ReactInputSelection.setSelection(input, {start: 1, end: 10});
      expect(input.selectionStart).toEqual(1);
      expect(input.selectionEnd).toEqual(10);

      var textarea = createAndMountElement('textarea', {
        defaultValue: textValue,
      });
      ReactInputSelection.setSelection(textarea, {start: 1, end: 10});
      expect(textarea.selectionStart).toEqual(1);
      expect(textarea.selectionEnd).toEqual(10);
    });

    it('sets selection on inputs in iframes', () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const input = document.createElement('input');
      input.value = textValue;
      iframe.contentDocument.body.appendChild(input);
      ReactInputSelection.setSelection(input, {start: 1, end: 10});
      expect(input.selectionStart).toEqual(1);
      expect(input.selectionEnd).toEqual(10);

      document.body.removeChild(iframe);
    });
  });

  describe('getSelectionInformation/restoreSelection', () => {
    it('gets and restores selection for inputs that get remounted', () => {
      // Mock window getSelection if needed
      var originalGetSelection = window.getSelection;
      window.getSelection = window.getSelection || makeGetSelection(window);
      var input = document.createElement('input');
      input.value = textValue;
      document.body.appendChild(input);
      input.focus();
      input.selectionStart = 1;
      input.selectionEnd = 10;
      var selectionInfo = ReactInputSelection.getSelectionInformation();
      expect(selectionInfo.activeElement).toBe(input);
      expect(selectionInfo.elementSelections[0].element).toBe(input);
      expect(selectionInfo.elementSelections[0].selectionRange).toEqual({
        start: 1,
        end: 10,
      });
      expect(document.activeElement).toBe(input);
      input.setSelectionRange(0, 0);
      document.body.removeChild(input);
      expect(document.activeElement).not.toBe(input);
      expect(input.selectionStart).not.toBe(1);
      expect(input.selectionEnd).not.toBe(10);
      document.body.appendChild(input);
      ReactInputSelection.restoreSelection(selectionInfo);
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(10);

      document.body.removeChild(input);
      window.getSelection = originalGetSelection;
    });

    it('gets and restores selection for inputs in an iframe that get remounted', () => {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      var iframeDoc = iframe.contentDocument;
      var iframeWin = iframeDoc.defaultView;
      // Mock window and iframe getSelection if needed
      var originalGetSelection = window.getSelection;
      var originalIframeGetSelection = iframeWin.getSelection;
      window.getSelection = window.getSelection || makeGetSelection(window);
      iframeWin.getSelection =
        iframeWin.getSelection || makeGetSelection(iframeWin);

      var input = document.createElement('input');
      input.value = textValue;
      iframeDoc.body.appendChild(input);
      input.focus();
      input.selectionStart = 1;
      input.selectionEnd = 10;
      var selectionInfo = ReactInputSelection.getSelectionInformation();
      expect(selectionInfo.activeElement === input).toBe(true);
      expect(selectionInfo.elementSelections[0].selectionRange).toEqual({
        start: 1,
        end: 10,
      });
      expect(document.activeElement).toBe(iframe);
      expect(iframeDoc.activeElement).toBe(input);

      input.setSelectionRange(0, 0);
      iframeDoc.body.removeChild(input);
      expect(iframeDoc.activeElement).not.toBe(input);
      expect(input.selectionStart).not.toBe(1);
      expect(input.selectionEnd).not.toBe(10);
      iframeDoc.body.appendChild(input);
      ReactInputSelection.restoreSelection(selectionInfo);
      expect(iframeDoc.activeElement).toBe(input);
      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(10);

      document.body.removeChild(iframe);
      window.getSelection = originalGetSelection;
      iframeWin.getSelection = originalIframeGetSelection;
    });
  });
});
