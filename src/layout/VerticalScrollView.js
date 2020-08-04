// @flow

import type {
  Interaction,
  VerticalPanStartInteraction,
  VerticalPanMoveInteraction,
  VerticalPanEndInteraction,
  WheelPlainInteraction,
} from '../useCanvasInteraction';
import type {Rect} from './geometry';

import {Surface} from './Surface';
import {View} from './View';
import {rectContainsPoint} from './geometry';
import {MOVE_WHEEL_DELTA_THRESHOLD} from '../canvas/constants'; // TODO: Remove external dependency

type VerticalScrollState = {|
  offsetY: number,
|};

function scrollStatesAreEqual(
  state1: VerticalScrollState,
  state2: VerticalScrollState,
): boolean {
  return state1.offsetY === state2.offsetY;
}

// TODO: Deduplicate
function clamp(min: number, max: number, value: number): number {
  if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(value)) {
    throw new Error(
      `Clamp was called with NaN. Args: min: ${min}, max: ${max}, value: ${value}.`,
    );
  }
  return Math.min(max, Math.max(min, value));
}

export class VerticalScrollView extends View {
  _scrollState: VerticalScrollState = {
    offsetY: 0,
  };

  _isPanning = false;

  _stateDeriver: (state: VerticalScrollState) => VerticalScrollState = state =>
    state;

  _onStateChange: (state: VerticalScrollState) => void = () => {};

  constructor(
    surface: Surface,
    frame: Rect,
    contentView: View,
    stateDeriver?: (state: VerticalScrollState) => VerticalScrollState,
    onStateChange?: (state: VerticalScrollState) => void,
  ) {
    super(surface, frame);
    this.addSubview(contentView);
    if (stateDeriver) this._stateDeriver = stateDeriver;
    if (onStateChange) this._onStateChange = onStateChange;
  }

  setFrame(newFrame: Rect) {
    super.setFrame(newFrame);

    // Revalidate scrollState
    this._updateState(this._scrollState);
  }

  desiredSize() {
    return this._contentView.desiredSize();
  }

  /**
   * Reference to the content view. This view is also the only view in
   * `this.subviews`.
   */
  get _contentView() {
    return this.subviews[0];
  }

  layoutSubviews() {
    const {offsetY} = this._scrollState;
    const desiredSize = this._contentView.desiredSize();

    const minimumHeight = this.frame.size.height;
    const desiredHeight = desiredSize ? desiredSize.height : 0;
    // Force view to take up at least all remaining vertical space.
    const height = Math.max(desiredHeight, minimumHeight);

    const proposedFrame = {
      origin: {
        x: this.frame.origin.x,
        y: this.frame.origin.y + offsetY,
      },
      size: {
        width: this.frame.size.width,
        height,
      },
    };
    this._contentView.setFrame(proposedFrame);
    super.layoutSubviews();
  }

  _handleVerticalPanStart(interaction: VerticalPanStartInteraction) {
    if (rectContainsPoint(interaction.payload.location, this.frame)) {
      this._isPanning = true;
    }
  }

  _handleVerticalPanMove(interaction: VerticalPanMoveInteraction) {
    if (!this._isPanning) {
      return;
    }
    const {offsetY} = this._scrollState;
    const {movementY} = interaction.payload.event;
    this._updateState({
      ...this._scrollState,
      offsetY: offsetY + movementY,
    });
  }

  _handleVerticalPanEnd(interaction: VerticalPanEndInteraction) {
    if (this._isPanning) {
      this._isPanning = false;
    }
  }

  _handleWheelPlain(interaction: WheelPlainInteraction) {
    const {
      location,
      event: {deltaX, deltaY},
    } = interaction.payload;
    if (!rectContainsPoint(location, this.frame)) {
      return; // Not scrolling on view
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    if (absDeltaX > absDeltaY) {
      return; // Scrolling horizontally
    }

    if (absDeltaY < MOVE_WHEEL_DELTA_THRESHOLD) {
      return;
    }

    this._updateState({
      ...this._scrollState,
      offsetY: this._scrollState.offsetY - deltaY,
    });
  }

  handleInteraction(interaction: Interaction) {
    switch (interaction.type) {
      case 'vertical-pan-start':
        this._handleVerticalPanStart(interaction);
        break;
      case 'vertical-pan-move':
        this._handleVerticalPanMove(interaction);
        break;
      case 'vertical-pan-end':
        this._handleVerticalPanEnd(interaction);
        break;
      case 'wheel-plain':
        this._handleWheelPlain(interaction);
        break;
    }
  }

  /**
   * @private
   */
  _updateState(proposedState: VerticalScrollState) {
    const clampedState = this._stateDeriver(
      this._clampedProposedState(proposedState),
    );
    if (!scrollStatesAreEqual(clampedState, this._scrollState)) {
      this._scrollState = clampedState;
      this._onStateChange(this._scrollState);
      this.setNeedsDisplay();
    }
  }

  /**
   * @private
   */
  _clampedProposedState(
    proposedState: VerticalScrollState,
  ): VerticalScrollState {
    return {
      offsetY: clamp(
        -(this._contentView.frame.size.height - this.frame.size.height),
        0,
        proposedState.offsetY,
      ),
    };
  }
}
