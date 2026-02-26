"""
env.py — Pure Python Lumines gymnasium environment.
Mirrors the interface of lumines_env.py (Node.js IPC) but runs entirely in Python.

Action spaces:
    per_block → Discrete(60):  targetX = action // 4, rotation = action % 4  (x=0..14, 15 valid cols)
    per_frame → Discrete(7):   [MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW,
                                 SOFT_DROP, HARD_DROP, NO_OP]

Reward (per_block mode)
-----------------------
The reward function is designed around Lumines' core combo mechanic: scoring
comes from the timeline sweeping across *consecutive columns* of same-color
2×2 patterns. Longer chains = more holding_score accumulated before payout.

    reward = score_delta
           + squares_delta * 0.2  # creating 2×2 same-color patterns (requires color matching)
           + chain_delta   * 0.3  # extending a run of consecutive pattern cols
           + height_delta         # -(height_increase / 160) * 0.5  (potential-based)
           + adj_bonus            # ADJ_BONUS_WEIGHT × same-color contacts (dense signal)
           + survival_bonus       # SURVIVAL_BONUS per step (not on game over)
           + death_penalty        # DEATH_PENALTY on game over, else 0

    score_delta    — actual game score increase this step (primary objective)
    squares_delta  — change in the number of 2×2 same-color patterns on the board;
                     positive when patterns are created, negative when swept by the
                     timeline (offset by the simultaneous score_delta payout)
    chain_delta    — change in the longest consecutive run of columns that
                     contain at least one 2×2 same-color pattern; rewards the
                     combo strategy of building and extending color chains
    height_delta   — change in aggregate column height * -0.5/160; penalises
                     raising the board, rewards clearing rows. Potential-based
                     so it does not shift the value-function baseline every step.
    adj_bonus      — ADJ_BONUS_WEIGHT × count of same-color contacts between the
                     placed block and pre-existing board cells (horizontal left/right
                     + vertical above, up to 6 contacts). Provides a dense per-step
                     signal that fires on every placement, before any pattern completes.
    survival_bonus — small constant reward per non-terminal step; gives the
                     critic a dense per-step signal to bootstrap from. Much
                     smaller than death_penalty so timid play is still penalised.
    death_penalty  — DEATH_PENALTY on game over

reward_components keys emitted in info:
    score_delta, squares_delta, chain_delta,
    adj_bonus, survival_bonus, death_penalty, height_delta, total

Per-frame mode uses a simpler sparse reward: score_delta + death_penalty.
"""

from __future__ import annotations
import copy
from typing import Optional

import numpy as np
import gymnasium as gym
from gymnasium import spaces

from .constants import BOARD_WIDTH, BOARD_HEIGHT, TIMELINE_SWEEP_INTERVAL
from .board import apply_gravity
from .patterns import detect_patterns
from .timeline import update_timeline
from .state import (
    create_initial_state, get_rng,
    move_left, move_right, rotate_cw, rotate_ccw,
    soft_drop, hard_drop, tick,
)
from .validation import find_drop_position

# Reward hyperparameters
DEATH_PENALTY = -3.0
SURVIVAL_BONUS = 0.05
ADJ_BONUS_WEIGHT = 0.04

FRAME_ACTIONS = [
    "MOVE_LEFT",
    "MOVE_RIGHT",
    "ROTATE_CW",
    "ROTATE_CCW",
    "SOFT_DROP",
    "HARD_DROP",
    "NO_OP",
]


class LuminesEnvNative(gym.Env):
    """
    Pure Python Lumines environment — no subprocess, no IPC.
    Identical observation/action spaces to LuminesEnv (IPC version).
    """

    metadata = {"render_modes": ["ansi"]}

    def __init__(
        self,
        mode: str = "per_block",
        seed: Optional[str] = None,
        render_mode: Optional[str] = None,
        blocks_per_sweep: int = 6,
    ):
        super().__init__()

        self.mode = mode
        self._seed = seed or ""
        self.render_mode = render_mode
        self._blocks_placed = 0
        # How many timeline ticks to advance per block placement.
        # One full sweep = BOARD_WIDTH * TIMELINE_SWEEP_INTERVAL ticks.
        # blocks_per_sweep=6 means ~6 blocks land per full timeline pass.
        self.ticks_per_block = (BOARD_WIDTH * TIMELINE_SWEEP_INTERVAL) // blocks_per_sweep

        # Action space
        if mode == "per_block":
            self.action_space = spaces.Discrete(60)  # 15 cols × 4 rotations (x=0..14)
        else:
            self.action_space = spaces.Discrete(len(FRAME_ACTIONS))

        # Observation space — identical to LuminesEnv
        self.observation_space = spaces.Dict(
            {
                "board": spaces.Box(0, 2, shape=(10, 16), dtype=np.int8),
                "current_block": spaces.Box(0, 2, shape=(2, 2), dtype=np.int8),
                "block_position": spaces.Box(
                    low=np.array([-2, -2], dtype=np.int32),
                    high=np.array([15, 9], dtype=np.int32),
                    dtype=np.int32,
                ),
                "queue": spaces.Box(0, 2, shape=(2, 2, 2), dtype=np.int8),
                "timeline_x": spaces.Box(0, 15, shape=(1,), dtype=np.int32),
                "score": spaces.Box(
                    0, np.iinfo(np.int32).max, shape=(1,), dtype=np.int32
                ),
                "frame": spaces.Box(
                    0, np.iinfo(np.int32).max, shape=(1,), dtype=np.int32
                ),
                "game_timer": spaces.Box(0, 3600, shape=(1,), dtype=np.int32),
                "column_heights": spaces.Box(0, BOARD_HEIGHT, shape=(BOARD_WIDTH,), dtype=np.float32),
                "holes": spaces.Box(0, BOARD_HEIGHT * BOARD_WIDTH, shape=(1,), dtype=np.int32),
            }
        )

        self._state = create_initial_state(self._seed)

    # -------------------------------------------------------------------------
    # Gymnasium API
    # -------------------------------------------------------------------------

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None,
    ):
        super().reset(seed=seed)
        if seed is not None:
            seed_str = str(seed)
        else:
            seed_str = str(self.np_random.integers(0, 1_000_000))
        self._seed = seed_str
        self._state = create_initial_state(seed_str)
        self._blocks_placed = 0
        return self._build_obs(), {}

    def step(self, action: int):
        if self._state.status == "gameOver":
            return self._build_obs(), 0.0, True, False, self._build_info()

        if self.mode == "per_block":
            return self._step_per_block(int(action))
        else:
            return self._step_per_frame(int(action))

    def render(self) -> Optional[str]:
        if self.render_mode != "ansi":
            return None
        return self._render_ascii()

    def close(self) -> None:
        pass

    # -------------------------------------------------------------------------
    # Per-block step
    # -------------------------------------------------------------------------

    def _step_per_block(self, action: int):
        prev_score = self._state.score
        prev_squares = self._count_complete_squares()
        prev_chain = self._count_chain_length()

        target_x = action // 4
        rotation = action % 4

        # Clamp targetX
        max_x = BOARD_WIDTH - 2
        target_x = max(0, min(target_x, max_x))

        rng = get_rng(self._state)

        # 1. Apply rotations
        for _ in range(rotation % 4):
            self._state = rotate_cw(self._state)

        # 2. Move horizontally to targetX
        dx = target_x - self._state.block_position_x
        if dx < 0:
            for _ in range(-dx):
                prev_x = self._state.block_position_x
                self._state = move_left(self._state)
                if self._state.block_position_x == prev_x:
                    break
        elif dx > 0:
            for _ in range(dx):
                prev_x = self._state.block_position_x
                self._state = move_right(self._state)
                if self._state.block_position_x == prev_x:
                    break

        # Capture actual column after movement (before hard drop changes block_position)
        actual_x = self._state.block_position_x

        # Capture pre-drop state for adj_bonus computation
        pre_drop_y = find_drop_position(
            self._state.board,
            self._state.current_block,
            actual_x,
            self._state.block_position_y,
            self._state.falling_columns,
        )
        pre_drop_pattern = [row[:] for row in self._state.current_block.pattern]

        # Pre-drop aggregate height for potential-based height shaping
        prev_aggregate_height = sum(self._column_heights())

        # 3. Hard drop — also spawns the next block immediately
        self._state = hard_drop(self._state, rng)

        if self._state.status != "gameOver":
            self._blocks_placed += 1

        # 4. Advance timeline by ticks_per_block ticks to simulate the sweep
        # progressing while the player was placing this block. Each tick
        # increments the frame counter, decrements the game timer, re-detects
        # patterns, and advances the timeline (marking and clearing cells).
        for _ in range(self.ticks_per_block):
            if self._state.status == "gameOver":
                break
            new_timer = self._state.game_timer - 1
            self._state = copy.copy(self._state)
            self._state.frame += 1
            if new_timer <= 0:
                self._state.game_timer = 0
                self._state.status = "gameOver"
                break
            self._state.game_timer = new_timer
            self._state.detected_patterns = detect_patterns(self._state.board)
            self._state = update_timeline(self._state)

        # 5. Settle any floating cells instantly — in per_block mode there are no
        # animation ticks between placements, so falling cells would otherwise
        # stay frozen and act as permanent obstacles while being invisible to
        # the board observation.
        if self._state.falling_columns:
            board = [row[:] for row in self._state.board]
            for col in self._state.falling_columns:
                for cell in col.cells:
                    if 0 <= cell.y < BOARD_HEIGHT:
                        board[cell.y][col.x] = cell.color
            self._state = copy.copy(self._state)
            self._state.board = apply_gravity(board)
            self._state.falling_columns = []

        score_delta = float(self._state.score - prev_score)
        squares_delta = float(self._count_complete_squares() - prev_squares)
        chain_delta = float(self._count_chain_length() - prev_chain)
        height_delta = -(sum(self._column_heights()) - prev_aggregate_height) / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5
        done = self._state.status == "gameOver"
        if not done:
            adj_bonus = self._count_adj_contacts(
                pre_drop_pattern, actual_x, pre_drop_y, self._state.board
            ) * ADJ_BONUS_WEIGHT
        else:
            adj_bonus = 0.0
        death = DEATH_PENALTY if done else 0.0
        survival = 0.0 if done else SURVIVAL_BONUS
        reward = score_delta + squares_delta * 0.2 + chain_delta * 0.3 + height_delta + adj_bonus + survival + death
        info = self._build_info()
        info["reward_components"] = {
            "score_delta": score_delta,
            "squares_delta": squares_delta,
            "chain_delta": chain_delta,
            "adj_bonus": adj_bonus,
            "survival_bonus": survival,
            "death_penalty": death,
            "height_delta": height_delta,
            "total": reward,
        }
        return self._build_obs(), reward, done, False, info

    # -------------------------------------------------------------------------
    # Per-frame step
    # -------------------------------------------------------------------------

    def _step_per_frame(self, action: int):
        prev_score = self._state.score
        rng = get_rng(self._state)

        action_name = FRAME_ACTIONS[action]
        if action_name == "MOVE_LEFT":
            self._state = move_left(self._state)
        elif action_name == "MOVE_RIGHT":
            self._state = move_right(self._state)
        elif action_name == "ROTATE_CW":
            self._state = rotate_cw(self._state)
        elif action_name == "ROTATE_CCW":
            self._state = rotate_ccw(self._state)
        elif action_name == "SOFT_DROP":
            self._state = soft_drop(self._state, rng)
        elif action_name == "HARD_DROP":
            self._state = hard_drop(self._state, rng)
        # NO_OP: do nothing

        # Always tick one frame
        rng = get_rng(self._state)
        self._state = tick(self._state, rng)

        score_delta = float(self._state.score - prev_score)
        done = self._state.status == "gameOver"
        # Note: per-frame mode uses a smaller death penalty (-1.0) than per-block mode
        # (DEATH_PENALTY). The two modes have different reward scales by design.
        reward = score_delta + (-1.0 if done else 0.0)
        return self._build_obs(), reward, done, False, self._build_info()

    def _count_adj_contacts(
        self,
        block_pattern: list,
        drop_x: int,
        drop_y: int,
        board: list,
    ) -> int:
        """
        Count same-color contacts between placed block cells and pre-existing
        board cells outside the 2×2 footprint (up to 6: H×4 + V-above×2).
        """
        if drop_y < 0:
            return 0
        contacts = 0
        for dy in range(2):
            row = drop_y + dy
            if row >= BOARD_HEIGHT:
                continue
            # Left neighbor of left cell
            if drop_x > 0:
                if board[row][drop_x - 1] == block_pattern[dy][0]:
                    contacts += 1
            # Right neighbor of right cell
            if drop_x + 2 < BOARD_WIDTH:
                if board[row][drop_x + 2] == block_pattern[dy][1]:
                    contacts += 1
        if drop_y > 0:
            above_row = drop_y - 1
            if board[above_row][drop_x] == block_pattern[0][0]:
                contacts += 1
            if board[above_row][drop_x + 1] == block_pattern[0][1]:
                contacts += 1
        return contacts

    def _compute_holes(self) -> int:
        """Count empty cells that have at least one filled cell above them in the same column."""
        board = self._state.board
        holes = 0
        for col in range(BOARD_WIDTH):
            found_filled = False
            for row in range(BOARD_HEIGHT):
                if board[row][col] != 0:
                    found_filled = True
                elif found_filled:
                    holes += 1
        return holes

    def _column_heights(self) -> list:
        """Returns height of each column (0 = empty, BOARD_HEIGHT = full)."""
        board = self._state.board
        heights = []
        for col in range(BOARD_WIDTH):
            h = 0
            for row in range(BOARD_HEIGHT):
                if board[row][col] != 0:
                    h = BOARD_HEIGHT - row
                    break
            heights.append(h)
        return heights

    def _max_column_height(self) -> int:
        """Returns the height of the tallest column (0 = empty board, BOARD_HEIGHT = full)."""
        return max(self._column_heights())

    def _count_chain_length(self) -> int:
        """Returns the longest consecutive run of columns with at least one pattern."""
        if not self._state.detected_patterns:
            return 0
        cols_with_patterns = set(p.x for p in self._state.detected_patterns)
        max_run = 0
        run = 0
        for c in range(BOARD_WIDTH - 1):  # pattern left edge can be 0..14
            if c in cols_with_patterns:
                run += 1
                max_run = max(max_run, run)
            else:
                run = 0
        return max_run

    def _count_complete_squares(self) -> int:
        """Count all 2×2 same-color squares on the board (overlapping squares counted separately)."""
        board = self._state.board
        count = 0
        for row in range(BOARD_HEIGHT - 1):
            for col in range(BOARD_WIDTH - 1):
                c = board[row][col]
                if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                    count += 1
        return count

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _build_obs(self) -> dict:
        s = self._state
        return {
            "board": np.array(s.board, dtype=np.int8),
            "current_block": np.array(s.current_block.pattern, dtype=np.int8),
            "block_position": np.array(
                [s.block_position_x, s.block_position_y], dtype=np.int32
            ),
            "queue": np.array(
                [b.pattern for b in s.queue[:2]], dtype=np.int8
            ),
            "timeline_x": np.array([s.timeline.x], dtype=np.int32),
            "score": np.array([s.score], dtype=np.int32),
            "frame": np.array([s.frame], dtype=np.int32),
            "game_timer": np.array([s.game_timer], dtype=np.int32),
            "column_heights": np.array(self._column_heights(), dtype=np.float32),
            "holes": np.array([self._compute_holes()], dtype=np.int32),
        }

    def _build_info(self) -> dict:
        return {
            "finalScore": self._state.score,
            "framesElapsed": self._state.frame,
            "blocksPlaced": self._blocks_placed,
        }

    def _render_ascii(self) -> str:
        s = self._state
        lines = []

        display = [row[:] for row in s.board]

        bx, by = s.block_position_x, s.block_position_y
        for dy in range(2):
            for dx in range(2):
                col = bx + dx
                row = by + dy
                if 0 <= row < BOARD_HEIGHT and 0 <= col < BOARD_WIDTH:
                    cell = s.current_block.pattern[dy][dx]
                    if cell != 0:
                        display[row][col] = cell + 2  # 3=current-light, 4=current-dark

        lines.append("   " + "0123456789012345")
        lines.append("  +" + "-" * BOARD_WIDTH + "+")

        for row in range(BOARD_HEIGHT):
            row_str = ""
            for col, c in enumerate(display[row]):
                if col == s.timeline.x:
                    row_str += "|" if c == 0 else ("I" if c in (1, 3) else "i")
                elif c == 0:
                    row_str += "."
                elif c == 1:
                    row_str += "□"
                elif c == 2:
                    row_str += "■"
                elif c == 3:
                    row_str += "o"
                else:
                    row_str += "x"
            lines.append(f"{row:2}|{row_str}|")

        lines.append("  +" + "-" * BOARD_WIDTH + "+")
        lines.append(
            f"  Timeline: col {s.timeline.x}  Score: {s.score}  "
            f"Frame: {s.frame}  Timer: {s.game_timer}  Blocks: {self._blocks_placed}"
        )
        return "\n".join(lines)
