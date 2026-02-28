"""
env.py — Pure Python Lumines gymnasium environment.
Mirrors the interface of lumines_env.py (Node.js IPC) but runs entirely in Python.

Action spaces:
    per_block → Discrete(60):  targetX = action // 4, rotation = action % 4  (x=0..14, 15 valid cols)
    per_frame → Discrete(7):   [MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW,
                                 SOFT_DROP, HARD_DROP, NO_OP]

Reward (per_block mode)
-----------------------
    reward = score_delta                        # primary: actual combo payoff (sparse, correct)
           + single_color_chain_delta * 0.1    # dense delta: change in longest single-color chain
           + post_sweep_chain * 0.05           # dense level: single-color chain after sweep + gravity
           + death                              # survival: DEATH_PENALTY on game over, else 0

    single_color_chain_delta: (chain_after_drop - chain_before), can be negative.
    Rewards placements that extend the best same-color chain; penalises those that break it.

    post_sweep_chain: longest consecutive same-color pattern-column run measured after
    all ticks and gravity settling. Rewards leaving the board in a "chain-ready" state.

reward_components keys emitted in info:
    score_delta, single_color_chain_delta, post_sweep_chain, death, total

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

# Reward hyperparameters
DEATH_PENALTY = -3.0

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

        # Observation space — color-separated board channels (PPO_32)
        self.observation_space = spaces.Dict(
            {
                "light_board": spaces.Box(0, 1, shape=(BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32),
                "dark_board": spaces.Box(0, 1, shape=(BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32),
                "light_pattern_board": spaces.Box(0, 1, shape=(BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32),
                "dark_pattern_board": spaces.Box(0, 1, shape=(BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32),
                "current_block": spaces.Box(0, 2, shape=(2, 2), dtype=np.int8),
                "queue": spaces.Box(0, 2, shape=(3, 2, 2), dtype=np.int8),
                "timeline_x": spaces.Box(0, 15, shape=(1,), dtype=np.int32),
                "game_timer": spaces.Box(0, 3600, shape=(1,), dtype=np.int32),
                "holding_score": spaces.Box(0, 1, shape=(1,), dtype=np.float32),
                "dominant_color_chain": spaces.Box(0, 1, shape=(1,), dtype=np.float32),
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

        target_x = action // 4
        rotation = action % 4

        # Clamp targetX
        max_x = BOARD_WIDTH - 2
        target_x = max(0, min(target_x, max_x))

        rng = get_rng(self._state)

        # Capture board state BEFORE drop for delta computation
        board_before = [row[:] for row in self._state.board]

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

        # 3. Hard drop — also spawns the next block immediately
        self._state = hard_drop(self._state, rng)

        if self._state.status != "gameOver":
            self._blocks_placed += 1

        # Measure single-color chain delta (can be negative).
        chain_before = float(self._count_max_single_color_chain_from_board(board_before))
        chain_after_drop = float(self._count_max_single_color_chain_from_board())
        single_color_chain_delta = chain_after_drop - chain_before

        # 4. Advance timeline by ticks_per_block ticks to simulate the sweep
        # progressing while the player was placing this block.
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

        # Measure post-sweep single-color chain (board readiness after combo + gravity settle).
        post_sweep_chain = float(self._count_max_single_color_chain_from_board())

        score_delta = float(self._state.score - prev_score)
        done = self._state.status == "gameOver"
        death = DEATH_PENALTY if done else 0.0
        reward = score_delta + single_color_chain_delta * 0.1 + post_sweep_chain * 0.05 + death
        info = self._build_info()
        info["reward_components"] = {
            "score_delta": score_delta,
            "single_color_chain_delta": single_color_chain_delta,
            "post_sweep_chain": post_sweep_chain,
            "death": death,
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

    def _count_chain_length_from_board(self, board=None) -> int:
        """
        Like _count_chain_length but scans the board directly instead of using
        self._state.detected_patterns. Use this immediately after hard_drop, before
        the tick loop refreshes detected_patterns.

        Optional board argument lets callers pass a projected board (e.g. after
        simulating clear + gravity) without mutating state.
        """
        board = board if board is not None else self._state.board
        cols_with_patterns: set[int] = set()
        for row in range(BOARD_HEIGHT - 1):
            for col in range(BOARD_WIDTH - 1):
                c = board[row][col]
                if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                    cols_with_patterns.add(col)
        if not cols_with_patterns:
            return 0
        max_run = 0
        run = 0
        for c in range(BOARD_WIDTH - 1):
            if c in cols_with_patterns:
                run += 1
                max_run = max(max_run, run)
            else:
                run = 0
        return max_run

    def _longest_run(self, col_set: set) -> int:
        max_run = run = 0
        for c in range(BOARD_WIDTH - 1):
            if c in col_set:
                run += 1
                max_run = max(max_run, run)
            else:
                run = 0
        return max_run

    def _count_max_single_color_chain_from_board(self, board=None) -> int:
        """Longest consecutive pattern-column run for the single best color."""
        board = board if board is not None else self._state.board
        light_cols: set[int] = set()
        dark_cols: set[int] = set()
        for row in range(BOARD_HEIGHT - 1):
            for col in range(BOARD_WIDTH - 1):
                c = board[row][col]
                if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                    (light_cols if c == 1 else dark_cols).add(col)
        return max(self._longest_run(light_cols), self._longest_run(dark_cols))

    def _build_color_board(self, color: int) -> np.ndarray:
        """Binary float32 (H×W): 1.0 where board cell == color."""
        return (np.array(self._state.board, dtype=np.float32) == color).astype(np.float32)

    def _count_patterns_in_zone(self, col_set: set) -> int:
        """Count 2×2 same-color patterns whose left-edge column is in col_set."""
        board = self._state.board
        count = 0
        for row in range(BOARD_HEIGHT - 1):
            for col in range(BOARD_WIDTH - 1):
                if col not in col_set:
                    continue
                c = board[row][col]
                if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                    count += 1
        return count

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

    def _build_color_pattern_channel(self, color: int) -> np.ndarray:
        """Cells participating in 2×2 same-color patterns for a single color, normalized /4."""
        board = self._state.board
        counts = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
        for row in range(BOARD_HEIGHT - 1):
            for col in range(BOARD_WIDTH - 1):
                c = board[row][col]
                if c == color and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                    counts[row][col]         += 1
                    counts[row][col + 1]     += 1
                    counts[row + 1][col]     += 1
                    counts[row + 1][col + 1] += 1
        return counts / 4.0

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _build_obs(self) -> dict:
        s = self._state
        return {
            "light_board": self._build_color_board(1),
            "dark_board": self._build_color_board(2),
            "light_pattern_board": self._build_color_pattern_channel(1),
            "dark_pattern_board": self._build_color_pattern_channel(2),
            "current_block": np.array(s.current_block.pattern, dtype=np.int8),
            "queue": np.array(
                [b.pattern for b in s.queue[:3]], dtype=np.int8
            ),
            "timeline_x": np.array([s.timeline.x], dtype=np.int32),
            "game_timer": np.array([s.game_timer], dtype=np.int32),
            "holding_score": np.array(
                [min(s.timeline.holding_score / 10.0, 1.0)], dtype=np.float32
            ),
            "dominant_color_chain": np.array(
                [self._count_max_single_color_chain_from_board() / (BOARD_WIDTH - 1)],
                dtype=np.float32,
            ),
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
