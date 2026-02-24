"""
state.py — Game state creation and the game tick logic.
Combines initialState.ts + gameTick.ts + placement.ts + movement.ts actions.
"""

import copy
import uuid

from .constants import (
    BOARD_WIDTH, BOARD_HEIGHT,
    FIXED_DROP_INTERVAL, GAME_DURATION_FRAMES, TIMELINE_SWEEP_INTERVAL,
    COUNTDOWN_START, COUNTDOWN_DURATION,
    INITIAL_POSITION_X, INITIAL_POSITION_Y,
)
from .types import GameState, Timeline
from .board import create_empty_board
from .blocks import generate_random_block, rotate_block_pattern, place_block_on_board, can_place_any_part_of_block
from .collision import is_valid_position
from .patterns import detect_patterns
from .physics import create_falling_columns, update_falling_columns
from .timeline import update_timeline
from .validation import find_drop_position
from .rng import SeededRNG


def create_initial_state(seed: str = "") -> GameState:
    """Create the initial GameState for a new game session."""
    rng = SeededRNG(seed)
    current_block = generate_random_block(rng)
    queue = [generate_random_block(rng) for _ in range(3)]

    return GameState(
        id=str(uuid.uuid4()),
        board=create_empty_board(),
        current_block=current_block,
        queue=queue,
        block_position_x=INITIAL_POSITION_X,
        block_position_y=INITIAL_POSITION_Y,
        status='playing',   # skip countdown — env always starts in playing state
        score=0,
        countdown=0,
        game_timer=GAME_DURATION_FRAMES,
        detected_patterns=[],
        marked_cells=[],
        frame=0,
        drop_timer=0,
        drop_interval=FIXED_DROP_INTERVAL,
        timeline=Timeline(
            x=0,
            sweep_interval=TIMELINE_SWEEP_INTERVAL,
            timer=0,
            active=True,
            holding_score=0,
        ),
        falling_columns=[],
        seed=seed,
        rng_state=rng.get_state(),
        debug_mode=False,
    )


# ---------------------------------------------------------------------------
# Movement
# ---------------------------------------------------------------------------

def move_left(state: GameState) -> GameState:
    if state.status != 'playing':
        return state
    new_x = state.block_position_x - 1
    if is_valid_position(state.board, state.current_block, new_x, state.block_position_y, state.falling_columns) == 'valid':
        state = copy.copy(state)
        state.block_position_x = new_x
    return state


def move_right(state: GameState) -> GameState:
    if state.status != 'playing':
        return state
    new_x = state.block_position_x + 1
    if is_valid_position(state.board, state.current_block, new_x, state.block_position_y, state.falling_columns) == 'valid':
        state = copy.copy(state)
        state.block_position_x = new_x
    return state


def rotate_cw(state: GameState) -> GameState:
    if state.status != 'playing':
        return state
    new_pattern = rotate_block_pattern(state.current_block.pattern, clockwise=True)
    from .types import Block
    test_block = Block(pattern=new_pattern, id=state.current_block.id)
    if is_valid_position(state.board, test_block, state.block_position_x, state.block_position_y, state.falling_columns) == 'valid':
        state = copy.copy(state)
        state.current_block = test_block
    return state


def rotate_ccw(state: GameState) -> GameState:
    if state.status != 'playing':
        return state
    new_pattern = rotate_block_pattern(state.current_block.pattern, clockwise=False)
    from .types import Block
    test_block = Block(pattern=new_pattern, id=state.current_block.id)
    if is_valid_position(state.board, test_block, state.block_position_x, state.block_position_y, state.falling_columns) == 'valid':
        state = copy.copy(state)
        state.current_block = test_block
    return state


# ---------------------------------------------------------------------------
# Block placement
# ---------------------------------------------------------------------------

def _check_game_over(state: GameState) -> GameState | None:
    if not can_place_any_part_of_block(state.board, state.block_position_x):
        state = copy.copy(state)
        state.status = 'gameOver'
        return state
    return None


def _update_block_queue(state: GameState, rng: SeededRNG):
    """Dequeue next block, generate a new tail block."""
    next_block = state.queue[0]
    remaining = state.queue[1:]
    new_block = generate_random_block(rng)
    return next_block, list(remaining) + [new_block], rng.get_state()


def _place_current_block(state: GameState, rng: SeededRNG) -> GameState:
    """Place the block on the board and spawn the next one."""
    game_over = _check_game_over(state)
    if game_over:
        return game_over

    new_board = place_block_on_board(
        state.board,
        state.falling_columns,
        state.current_block,
        state.block_position_x,
        state.block_position_y,
    )

    next_block, new_queue, new_rng_state = _update_block_queue(state, rng)

    state = copy.copy(state)
    state.board = new_board
    state.current_block = next_block
    state.queue = new_queue
    state.rng_state = new_rng_state
    state.block_position_x = INITIAL_POSITION_X
    state.block_position_y = INITIAL_POSITION_Y
    state.drop_timer = 0
    state.drop_interval = FIXED_DROP_INTERVAL
    return state


def _place_block_and_apply_physics(state: GameState, rng: SeededRNG) -> GameState:
    placed = _place_current_block(state, rng)
    if placed.status == 'gameOver':
        return placed
    new_falling_cols, new_board = create_falling_columns(placed.board, placed.falling_columns)
    placed = copy.copy(placed)
    placed.board = new_board
    placed.falling_columns = new_falling_cols
    return placed


def hard_drop(state: GameState, rng: SeededRNG) -> GameState:
    if state.status != 'playing':
        return state
    drop_y = find_drop_position(
        state.board, state.current_block,
        state.block_position_x, state.block_position_y,
        state.falling_columns,
    )
    state = copy.copy(state)
    state.block_position_y = drop_y
    return _place_block_and_apply_physics(state, rng)


def soft_drop(state: GameState, rng: SeededRNG) -> GameState:
    if state.status != 'playing':
        return state
    new_y = state.block_position_y + 1
    if is_valid_position(state.board, state.current_block, state.block_position_x, new_y, state.falling_columns) == 'valid':
        state = copy.copy(state)
        state.block_position_y = new_y
        state.drop_timer = 0
        return state
    return _place_block_and_apply_physics(state, rng)


# ---------------------------------------------------------------------------
# Game tick
# ---------------------------------------------------------------------------

def tick(state: GameState, rng: SeededRNG) -> GameState:
    """Advance the game by one frame."""
    if state.status == 'gameOver':
        return state

    # Decrement game timer
    new_game_timer = state.game_timer - 1
    if new_game_timer <= 0:
        state = copy.copy(state)
        state.status = 'gameOver'
        state.game_timer = 0
        state.frame += 1
        return state

    state = copy.copy(state)
    state.game_timer = new_game_timer
    state.frame += 1

    # Handle automatic block drop
    new_drop_timer = state.drop_timer + 1
    if new_drop_timer >= state.drop_interval:
        drop_y = state.block_position_y + 1
        if is_valid_position(state.board, state.current_block, state.block_position_x, drop_y, state.falling_columns) == 'valid':
            state.block_position_y = drop_y
            state.drop_timer = 0
        else:
            state.drop_timer = new_drop_timer
            state = _place_block_and_apply_physics(state, rng)
            if state.status == 'gameOver':
                return state
    else:
        state.drop_timer = new_drop_timer

    # Update pattern detection
    state.detected_patterns = detect_patterns(state.board)

    # Update timeline
    state = update_timeline(state)

    # Update falling columns
    new_board, new_falling_cols = update_falling_columns(state.board, state.falling_columns)
    state = copy.copy(state)
    state.board = new_board
    state.falling_columns = new_falling_cols

    return state


def get_rng(state: GameState) -> SeededRNG:
    """Reconstruct the RNG at the current call-count position."""
    rng = SeededRNG(state.seed)
    rng.set_state(state.rng_state)
    return rng
