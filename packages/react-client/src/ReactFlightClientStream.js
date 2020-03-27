/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Response} from './ReactFlightClientHostConfigStream';

import {
  resolveModel,
  resolveError,
  createResponse as createResponseBase,
  parseModelString,
  parseModelTuple,
} from './ReactFlightClient';

import {
  readPartialStringChunk,
  readFinalStringChunk,
  supportsBinaryStreams,
  createStringDecoder,
} from './ReactFlightClientHostConfig';

export type {Response};

function processFullRow<T>(response: Response<T>, row: string): void {
  if (row === '') {
    return;
  }
  const tag = row[0];
  switch (tag) {
    case 'J': {
      const colon = row.indexOf(':', 1);
      const id = parseInt(row.substring(1, colon), 16);
      const json = row.substring(colon + 1);
      resolveModel(response, id, json);
      return;
    }
    case 'E': {
      const colon = row.indexOf(':', 1);
      const id = parseInt(row.substring(1, colon), 16);
      const json = row.substring(colon + 1);
      const errorInfo = JSON.parse(json);
      resolveError(response, id, errorInfo.message, errorInfo.stack);
      return;
    }
    default: {
      // Assume this is the root model.
      resolveModel(response, 0, row);
      return;
    }
  }
}

export function processStringChunk<T>(
  response: Response<T>,
  chunk: string,
  offset: number,
): void {
  let linebreak = chunk.indexOf('\n', offset);
  while (linebreak > -1) {
    const fullrow = response.partialRow + chunk.substring(offset, linebreak);
    processFullRow(response, fullrow);
    response.partialRow = '';
    offset = linebreak + 1;
    linebreak = chunk.indexOf('\n', offset);
  }
  response.partialRow += chunk.substring(offset);
}

export function processBinaryChunk<T>(
  response: Response<T>,
  chunk: Uint8Array,
): void {
  if (!supportsBinaryStreams) {
    throw new Error("This environment don't support binary chunks.");
  }
  const stringDecoder = response.stringDecoder;
  let linebreak = chunk.indexOf(10); // newline
  while (linebreak > -1) {
    const fullrow =
      response.partialRow +
      readFinalStringChunk(stringDecoder, chunk.subarray(0, linebreak));
    processFullRow(response, fullrow);
    response.partialRow = '';
    chunk = chunk.subarray(linebreak + 1);
    linebreak = chunk.indexOf(10); // newline
  }
  response.partialRow += readPartialStringChunk(stringDecoder, chunk);
}

function createFromJSONCallback<T>(response: Response<T>) {
  return function(key: string, value: JSONValue) {
    if (typeof value === 'string') {
      // We can't use .bind here because we need the "this" value.
      return parseModelString(response, this, value);
    }
    if (typeof value === 'object' && value !== null) {
      return parseModelTuple(response, value);
    }
    return value;
  };
}

export function createResponse<T>(): Response<T> {
  // NOTE: CHECK THE COMPILER OUTPUT EACH TIME YOU CHANGE THIS.
  // It should be inlined to one object literal but minor changes can break it.
  const stringDecoder = supportsBinaryStreams ? createStringDecoder() : null;
  const response: any = createResponseBase();
  response.partialRow = '';
  if (supportsBinaryStreams) {
    response.stringDecoder = stringDecoder;
  }
  // Don't inline this call because it causes closure to outline the call above.
  response.fromJSON = createFromJSONCallback(response);
  return response;
}

export {reportGlobalError, close} from './ReactFlightClient';
