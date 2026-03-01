"""
lumines_env.py — Gymnasium wrapper for the Lumines headless environment.

Spawns a Node.js subprocess running src/ai/env-server.ts via tsx.
One subprocess per env instance → naturally parallelisable with
gymnasium.vector.AsyncVectorEnv or SubprocVecEnv.

Usage:
    env = LuminesEnv(mode='per_block', seed='abc')
    obs, info = env.reset()
    obs, reward, terminated, truncated, info = env.step(action)
    env.close()

Action spaces:
    per_block → Discrete(64):  targetX = action // 4, rotation = action % 4
    per_frame → Discrete(7):   [MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW,
                                 SOFT_DROP, HARD_DROP, NO_OP]
"""

import json
import os
import subprocess
from typing import Any, Optional

import numpy as np
import gymnasium as gym
from gymnasium import spaces

FRAME_ACTIONS = [
    "MOVE_LEFT",
    "MOVE_RIGHT",
    "ROTATE_CW",
    "ROTATE_CCW",
    "SOFT_DROP",
    "HARD_DROP",
    "NO_OP",
]


class LuminesEnv(gym.Env):
    metadata = {"render_modes": ["ansi"]}

    def __init__(
        self,
        mode: str = "per_block",
        seed: Optional[str] = None,
        render_mode: Optional[str] = None,
        repo_root: Optional[str] = None,
        record_replay_path: Optional[str] = None,
    ):
        super().__init__()

        self.mode = mode
        self._seed = seed
        self.render_mode = render_mode
        self._record_replay_path = record_replay_path

        # Locate the repo root (parent of the python/ directory by default)
        if repo_root is None:
            repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self._repo_root = repo_root

        self._tsx = os.path.join(repo_root, "node_modules", ".bin", "tsx")
        self._server_script = os.path.join(repo_root, "src", "ai", "env-server.ts")
        self._tsconfig = os.path.join(repo_root, "tsconfig.app.json")
        self._proc: Optional[subprocess.Popen] = None  # type: ignore[type-arg]

        # Action space
        if mode == "per_block":
            self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations
        else:
            self.action_space = spaces.Discrete(len(FRAME_ACTIONS))

        # Observation space
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
            }
        )

    # -------------------------------------------------------------------------

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None,  # type: ignore[type-arg]
    ) -> tuple[dict, dict]:  # type: ignore[type-arg]
        super().reset(seed=seed)
        if self._proc is None or self._proc.poll() is not None:
            self._start_proc()
        if seed is not None:
            seed_str = str(seed)
        else:
            seed_str = str(self.np_random.integers(0, 1_000_000))
        self._send({"cmd": "reset", "seed": seed_str})
        resp = self._recv()
        return self._obs_to_numpy(resp["observation"]), {}

    def step(self, action: int) -> tuple:  # type: ignore[override]
        self._send({"cmd": "step", "action": self._encode_action(action)})
        resp = self._recv()
        obs = self._obs_to_numpy(resp["observation"])
        return obs, float(resp["reward"]), bool(resp["done"]), False, resp["info"]

    def render(self) -> Optional[str]:
        if self.render_mode != "ansi":
            return None
        self._send({"cmd": "render"})
        resp = self._recv()
        return resp["ascii"]  # type: ignore[no-any-return]

    def close(self) -> None:
        if self._proc and self._proc.poll() is None:
            try:
                self._send({"cmd": "close"})
            except Exception:
                pass
            self._proc.terminate()
        self._proc = None

    # -------------------------------------------------------------------------

    def _start_proc(self) -> None:
        cmd = [
            self._tsx, "--tsconfig", self._tsconfig,
            self._server_script, "--mode", self.mode,
        ]
        if self._record_replay_path:
            cmd += ["--record-replay", self._record_replay_path]
        self._proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,  # line-buffered
            cwd=self._repo_root,
        )

    def _send(self, obj: Any) -> None:
        assert self._proc and self._proc.stdin
        self._proc.stdin.write(json.dumps(obj) + "\n")
        self._proc.stdin.flush()

    def _recv(self) -> Any:
        assert self._proc and self._proc.stdout
        line = self._proc.stdout.readline()
        return json.loads(line)

    def _obs_to_numpy(self, obs: dict) -> dict:  # type: ignore[type-arg]
        bp = obs["blockPosition"]
        return {
            "board": np.array(obs["board"], dtype=np.int8),
            "current_block": np.array(obs["currentBlock"], dtype=np.int8),
            "block_position": np.array([bp["x"], bp["y"]], dtype=np.int32),
            "queue": np.array(obs["queue"], dtype=np.int8),
            "timeline_x": np.array([obs["timelineX"]], dtype=np.int32),
            "score": np.array([obs["score"]], dtype=np.int32),
            "frame": np.array([obs["frame"]], dtype=np.int32),
        }

    def _encode_action(self, action: int) -> Any:
        if self.mode == "per_block":
            return {"targetX": int(action) // 4, "rotation": int(action) % 4}
        return FRAME_ACTIONS[int(action)]
