"""
timeline.py — Timeline sweep and scoring logic.
Port of src/utils/gameLogic/timeline.ts
"""

import copy
from .constants import BOARD_WIDTH
from .types import GameState
from .patterns import detect_patterns, get_patterns_by_left_column, mark_column_cells
from .physics import clear_marked_cells_and_apply_gravity


def update_timeline(state: GameState) -> GameState:
    """
    Advance the timeline timer by one frame.
    When the sweep interval is reached, advance the timeline to the next column.
    """
    if state.status != 'playing':
        return state

    new_timer = state.timeline.timer + 1

    if new_timer >= state.timeline.sweep_interval:
        return _advance_timeline_to_next_column(state)

    # Just increment timer
    state = copy.copy(state)
    tl = copy.copy(state.timeline)
    tl.timer = new_timer
    state.timeline = tl
    return state


def _advance_timeline_to_next_column(state: GameState) -> GameState:
    """Move the timeline sweep one column to the right and process it."""
    next_column = (state.timeline.x + 1) % BOARD_WIDTH

    processed = _process_timeline_column(state, next_column)

    processed = copy.copy(processed)
    tl = copy.copy(processed.timeline)
    tl.x = next_column
    tl.timer = 0
    processed.timeline = tl
    return processed


def _process_timeline_column(state: GameState, column: int) -> GameState:
    """Process a single column as the timeline sweeps through it."""
    patterns_in_column = get_patterns_by_left_column(state.detected_patterns, column)
    patterns_in_prev_column = get_patterns_by_left_column(state.detected_patterns, column - 1)

    has_current = len(patterns_in_column) > 0
    has_prev = len(patterns_in_prev_column) > 0

    # Case 1: Mark cells for clearing if there are patterns
    if has_current or has_prev:
        return _mark_cells_for_clearing(state, column, patterns_in_column)

    # Case 2: Clear marked cells if no patterns and we have pending score
    should_clear = (
        not has_current and
        not has_prev and
        state.timeline.holding_score > 0 and
        len(state.marked_cells) > 0
    )

    if should_clear:
        return _clear_marked_cells_and_score(state)

    return state


def _mark_cells_for_clearing(state, column, patterns_in_column):
    """Mark cells for clearing and accumulate holding score."""
    holding_points = len(patterns_in_column)
    new_marked = mark_column_cells(column, state.detected_patterns)

    state = copy.copy(state)
    tl = copy.copy(state.timeline)
    tl.holding_score = tl.holding_score + holding_points
    state.timeline = tl
    state.marked_cells = list(state.marked_cells) + new_marked
    return state


def _clear_marked_cells_and_score(state: GameState) -> GameState:
    """Clear all marked cells, apply gravity, and add holding_score to score."""
    new_falling_cols, new_board = clear_marked_cells_and_apply_gravity(
        state.board,
        state.marked_cells,
        state.falling_columns,
    )
    detected = detect_patterns(new_board)

    state = copy.copy(state)
    state.board = new_board
    state.falling_columns = new_falling_cols
    state.detected_patterns = detected
    state.score = state.score + state.timeline.holding_score
    tl = copy.copy(state.timeline)
    tl.holding_score = 0
    state.timeline = tl
    state.marked_cells = []
    return state
