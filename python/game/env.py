"""
env.py — Pure Python Lumines gymnasium environment.
Mirrors the interface of lumines_env.py (Node.js IPC) but runs entirely in Python.

Action spaces:
    per_block → Discrete(64):  targetX = action // 4, rotation = action % 4
    per_frame → Discrete(7):   [MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW,
                                 SOFT_DROP, HARD_DROP, NO_OP]
"""

from __future__ import annotations
import copy
from typing import Optional

import numpy as np
import gymnasium as gym
from gymnasium import spaces

from .constants import BOARD_WIDTH, BOARD_HEIGHT
from .state import (
    create_initial_state, get_rng,
    move_left, move_right, rotate_cw, rotate_ccw,
    soft_drop, hard_drop, tick,
)

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
    ):
        super().__init__()

        self.mode = mode
        self._seed = seed or ""
        self.render_mode = render_mode
        self._blocks_placed = 0

        # Action space
        if mode == "per_block":
            self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations
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
        seed_str = str(seed) if seed is not None else self._seed
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
        prev_block_id = self._state.current_block.id

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

        # 3. Hard drop
        self._state = hard_drop(self._state, rng)

        # 4. Safety ticks until new block spawns or game over
        safety = 0
        while (
            self._state.status != "gameOver" and
            self._state.current_block.id == prev_block_id and
            safety < 1000
        ):
            rng = get_rng(self._state)
            self._state = tick(self._state, rng)
            safety += 1

        if self._state.status != "gameOver":
            self._blocks_placed += 1

        reward = float(self._state.score - prev_score)
        done = self._state.status == "gameOver"
        return self._build_obs(), reward, done, False, self._build_info()

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

        reward = float(self._state.score - prev_score)
        done = self._state.status == "gameOver"
        return self._build_obs(), reward, done, False, self._build_info()

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
