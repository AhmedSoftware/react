/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {
  ReactScopeInstance,
  ReactContext,
  ReactScopeQuery,
} from 'shared/ReactTypes';

import {
  getPublicInstance,
  getInstanceFromNode,
  getInstanceFromScope,
} from './ReactFiberHostConfig';
import {isFiberSuspenseAndTimedOut} from './ReactFiberTreeReflection';

import {HostComponent, ScopeComponent, ContextProvider} from './ReactWorkTags';
import {enableScopeAPI} from 'shared/ReactFeatureFlags';

function getSuspenseFallbackChild(fiber: Fiber): Fiber | null {
  return ((((fiber.child: any): Fiber).sibling: any): Fiber).child;
}

const emptyObject = {};

function collectScopedNodes(
  node: Fiber,
  fn: ReactScopeQuery,
  scopedNodes: Array<any>,
): void {
  if (enableScopeAPI) {
    if (node.tag === HostComponent) {
      const {type, memoizedProps, stateNode} = node;
      const instance = getPublicInstance(stateNode);
      if (
        instance !== null &&
        fn(type, memoizedProps || emptyObject, instance) === true
      ) {
        scopedNodes.push(instance);
      }
    }
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      collectScopedNodesFromChildren(child, fn, scopedNodes);
    }
  }
}

function collectFirstScopedNode(
  node: Fiber,
  fn: ReactScopeQuery,
): null | Object {
  if (enableScopeAPI) {
    if (node.tag === HostComponent) {
      const {type, memoizedProps, stateNode} = node;
      const instance = getPublicInstance(stateNode);
      if (instance !== null && fn(type, memoizedProps, instance) === true) {
        return instance;
      }
    }
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      return collectFirstScopedNodeFromChildren(child, fn);
    }
  }
  return null;
}

function collectScopedNodesFromChildren(
  startingChild: Fiber,
  fn: ReactScopeQuery,
  scopedNodes: Array<any>,
): void {
  let child = startingChild;
  while (child !== null) {
    collectScopedNodes(child, fn, scopedNodes);
    child = child.sibling;
  }
}

function collectFirstScopedNodeFromChildren(
  startingChild: Fiber,
  fn: ReactScopeQuery,
): Object | null {
  let child = startingChild;
  while (child !== null) {
    const scopedNode = collectFirstScopedNode(child, fn);
    if (scopedNode !== null) {
      return scopedNode;
    }
    child = child.sibling;
  }
  return null;
}

function collectNearestContextValues<T: any>(
  node: Fiber,
  context: ReactContext<T>,
  childContextValues: Array<T>,
): void {
  if (node.tag === ContextProvider && node.type._context === context) {
    const contextValue = node.memoizedProps.value;
    childContextValues.push(contextValue);
  } else {
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      collectNearestChildContextValues(child, context, childContextValues);
    }
  }
}

function collectNearestChildContextValues<T: any>(
  startingChild: Fiber | null,
  context: ReactContext<T>,
  childContextValues: Array<T>,
): void {
  let child = startingChild;
  while (child !== null) {
    collectNearestContextValues(child, context, childContextValues);
    child = child.sibling;
  }
}

function DO_NOT_USE_queryAllNodes(fn: ReactScopeQuery): null | Array<Object> {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return null;
  }
  const child = currentFiber.child;
  const scopedNodes = [];
  if (child !== null) {
    collectScopedNodesFromChildren(child, fn, scopedNodes);
  }
  return scopedNodes.length === 0 ? null : scopedNodes;
}

function DO_NOT_USE_queryFirstNode(fn: ReactScopeQuery): null | Object {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return null;
  }
  const child = currentFiber.child;
  if (child !== null) {
    return collectFirstScopedNodeFromChildren(child, fn);
  }
  return null;
}

function containsNode(node: Object): boolean {
  let fiber = getInstanceFromNode(node);
  while (fiber !== null) {
    if (fiber.tag === ScopeComponent && fiber.stateNode === this) {
      return true;
    }
    fiber = fiber.return;
  }
  return false;
}

function getChildContextValues<T: any>(context: ReactContext<T>): Array<T> {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return [];
  }
  const child = currentFiber.child;
  const childContextValues = [];
  if (child !== null) {
    collectNearestChildContextValues(child, context, childContextValues);
  }
  return childContextValues;
}

export function createScopeInstance(): ReactScopeInstance {
  return {
    DO_NOT_USE_queryAllNodes,
    DO_NOT_USE_queryFirstNode,
    containsNode,
    getChildContextValues,
  };
}
