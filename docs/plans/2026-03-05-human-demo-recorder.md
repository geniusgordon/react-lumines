# Human Demo Recorder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a terminal human-play interface over `LuminesEnvNative` that records gameplay as seed + action sequences for future behavioral cloning.

**Architecture:** Two scripts — `python/play.py` (interactive play + recording) and `python/extract_demos.py` (replays demos to build numpy (obs, action) dataset). Play uses `per_block` mode (cursor column + rotation → Enter to drop), matching the trained model's action space exactly.

**Tech Stack:** Python stdlib (`termios`, `tty`, `select`, `json`, `datetime`), `numpy`, `game.env.LuminesEnvNative`, `game.blocks.rotate_block_pattern`, `game.validation.find_drop_position`

---

### Task 1: Ghost piece helper

**Files:**
- Create: `python/play.py`
- Create: `python/tests/test_play.py`

**Step 1: Write the failing test**

```python
# python/tests/test_play.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from game.env import LuminesEnvNative

def test_compute_ghost_returns_valid_position():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Ghost at col 7, rot 0 must land within board bounds
    ghost_block, ghost_x, ghost_y = _compute_ghost(env._state, cursor_col=7, cursor_rot=0)
    assert 0 <= ghost_x <= 14
    assert 0 <= ghost_y < 10  # BOARD_HEIGHT

def test_compute_ghost_clamps_column():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Column 15 is out of range (max_x = BOARD_WIDTH - 2 = 14)
    _, ghost_x, _ = _compute_ghost(env._state, cursor_col=15, cursor_rot=0)
    assert ghost_x <= 14

def test_compute_ghost_respects_rotation():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    block0, _, _ = _compute_ghost(env._state, cursor_col=7, cursor_rot=0)
    block1, _, _ = _compute_ghost(env._state, cursor_col=7, cursor_rot=1)
    # Patterns may differ after rotation (not always equal for asymmetric blocks)
    # At minimum, both return a 2x2 pattern
    assert len(block0.pattern) == 2
    assert len(block1.pattern) == 2
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/gordon/Playground/react-lumines/master
python/.venv/bin/pytest python/tests/test_play.py -v
```

Expected: `ModuleNotFoundError: No module named 'play'`

**Step 3: Implement `_compute_ghost` in `python/play.py`**

```python
"""
play.py — Human-playable Lumines terminal interface with demo recording.

Usage:
    python python/play.py                        # random seed
    python python/play.py --seed 42              # fixed seed
    python python/play.py --demos-dir my_demos   # custom output dir

Controls:
    ← / →   move column cursor
    z / x   rotate piece CCW / CW
    Space   drop piece
    q       quit and save demo
"""

import argparse
import json
import os
import select
import sys
import termios
import tty
from datetime import datetime

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from game.env import LuminesEnvNative
from game.blocks import rotate_block_pattern
from game.types import Block
from game.validation import find_drop_position
from game.constants import BOARD_WIDTH, BOARD_HEIGHT


def _compute_ghost(state, cursor_col: int, cursor_rot: int):
    """Return (rotated_block, ghost_x, ghost_y) for the current cursor position.

    Read-only: does not mutate state.
    """
    # Apply rotation to a copy of the current block pattern
    pattern = [row[:] for row in state.current_block.pattern]
    for _ in range(cursor_rot % 4):
        pattern = rotate_block_pattern(pattern, clockwise=True)
    ghost_block = Block(pattern=pattern, id=state.current_block.id)

    # Clamp column (block is 2 wide, so max left edge = BOARD_WIDTH - 2)
    ghost_x = max(0, min(cursor_col, BOARD_WIDTH - 2))

    # Find drop position from the block's current y (top of board)
    ghost_y = find_drop_position(
        state.board, ghost_block, ghost_x, state.block_position_y, state.falling_columns
    )
    return ghost_block, ghost_x, ghost_y
```

**Step 4: Run test to verify it passes**

```bash
python/.venv/bin/pytest python/tests/test_play.py -v
```

Expected: 3 PASS

**Step 5: Commit**

```bash
git add python/play.py python/tests/test_play.py
git commit -m "feat(play): add ghost piece helper with tests"
```

---

### Task 2: ASCII render with ghost and cursor

**Files:**
- Modify: `python/play.py`
- Modify: `python/tests/test_play.py`

**Step 1: Write the failing test**

Add to `python/tests/test_play.py`:

```python
def test_render_play_contains_score():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=7, cursor_rot=0)
    assert "Score" in output

def test_render_play_shows_cursor_col():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=5, cursor_rot=2)
    assert "Col: 5" in output
    assert "Rot: 2" in output

def test_render_play_shows_controls():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=7, cursor_rot=0)
    assert "Space" in output or "drop" in output.lower()
```

**Step 2: Run test to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_play.py::test_render_play_contains_score -v
```

Expected: `ImportError` or `AttributeError`

**Step 3: Implement `_render_play`**

Add to `python/play.py` after `_compute_ghost`:

```python
# Cell display characters
_CELL_CHARS = {
    0: ".",   # empty
    1: "□",   # light board cell
    2: "■",   # dark board cell
    3: "◦",   # ghost light (where piece will land)
    4: "·",   # ghost dark
}


def _render_play(env, cursor_col: int, cursor_rot: int) -> str:
    """Render ASCII board with ghost piece, cursor, queue, and controls."""
    s = env._state
    ghost_block, ghost_x, ghost_y = _compute_ghost(s, cursor_col, cursor_rot)

    # Build display grid: copy board, overlay ghost
    display = [row[:] for row in s.board]
    for dy in range(2):
        for dx in range(2):
            cell = ghost_block.pattern[dy][dx]
            if cell == 0:
                continue
            row, col = ghost_y + dy, ghost_x + dx
            if 0 <= row < BOARD_HEIGHT and 0 <= col < BOARD_WIDTH:
                display[row][col] = cell + 2  # 3=ghost-light, 4=ghost-dark

    lines = []

    # Controls header
    lines.append("  ←/→ move   z/x rotate   Space drop   q quit")
    lines.append(f"  Col: {cursor_col}   Rot: {cursor_rot}")
    lines.append("")

    # Column cursor arrow above board
    cursor_arrow = "   "
    for c in range(BOARD_WIDTH):
        cursor_arrow += "↓" if c == ghost_x else " "
    lines.append(cursor_arrow)

    # Board
    lines.append("   " + "0123456789012345")
    lines.append("  +" + "-" * BOARD_WIDTH + "+")
    for row in range(BOARD_HEIGHT):
        row_str = ""
        for col, c in enumerate(display[row]):
            if col == s.timeline.x:
                # Timeline marker takes precedence visually
                row_str += "|" if c in (0, 3, 4) else ("I" if c == 1 else "i")
            else:
                row_str += _CELL_CHARS.get(c, "?")
        lines.append(f"{row:2}|{row_str}|")
    lines.append("  +" + "-" * BOARD_WIDTH + "+")

    # Current block (rotated)
    cur_pat = ghost_block.pattern
    cur_row0 = "".join("□" if c == 1 else ("■" if c == 2 else ".") for c in cur_pat[0])
    cur_row1 = "".join("□" if c == 1 else ("■" if c == 2 else ".") for c in cur_pat[1])

    # Queue blocks
    queue_rows = [[], []]
    for b in s.queue[:3]:
        queue_rows[0].append("".join("□" if c == 1 else ("■" if c == 2 else ".") for c in b.pattern[0]))
        queue_rows[1].append("".join("□" if c == 1 else ("■" if c == 2 else ".") for c in b.pattern[1]))

    lines.append(
        f"  Now: {cur_row0}  Next: {' | '.join(queue_rows[0])}"
    )
    lines.append(
        f"       {cur_row1}        {' | '.join(queue_rows[1])}"
    )
    lines.append(
        f"  Score: {s.score}   Blocks: {env._blocks_placed}   Timeline: col {s.timeline.x}"
    )

    return "\n".join(lines)
```

**Step 4: Run tests**

```bash
python/.venv/bin/pytest python/tests/test_play.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add python/play.py python/tests/test_play.py
git commit -m "feat(play): add ASCII render with ghost piece and cursor"
```

---

### Task 3: Input handling and game loop

**Files:**
- Modify: `python/play.py`

No new tests — this is terminal I/O. Manual smoke-test after implementation.

**Step 1: Add `_getch` and `play` function**

Add to `python/play.py`:

```python
def _getch():
    """Read a single keypress; arrow keys returned as 'LEFT'/'RIGHT'."""
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = os.read(fd, 1)
        if ch == b"\x1b":
            rlist, _, _ = select.select([fd], [], [], 0.05)
            if rlist:
                ch2 = os.read(fd, 1)
                if ch2 == b"[":
                    rlist2, _, _ = select.select([fd], [], [], 0.05)
                    if rlist2:
                        ch3 = os.read(fd, 1)
                        if ch3 == b"D":
                            return "LEFT"
                        elif ch3 == b"C":
                            return "RIGHT"
        decoded = ch.decode("utf-8", errors="replace")
        if decoded == "\x03":
            raise KeyboardInterrupt
        return decoded
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


import os  # add at top of file if not present


def play(seed: str, demos_dir: str) -> None:
    """Run one human-played game and save the demo on quit or game over."""
    env = LuminesEnvNative(mode="per_block", seed=seed)
    env.reset(seed=int(seed) if seed.isdigit() else None)

    cursor_col = 7
    cursor_rot = 0
    actions: list[list[int]] = []
    done = False

    print(f"Starting game with seed={seed!r}. Use ←/→ to move, z/x to rotate, Space to drop, q to quit.")

    while not done:
        # Render
        frame = _render_play(env, cursor_col, cursor_rot)
        print("\033[2J\033[H", end="")   # clear screen
        print(frame, flush=True)

        # Input
        ch = _getch()

        if ch == "LEFT":
            cursor_col = max(0, cursor_col - 1)
        elif ch == "RIGHT":
            cursor_col = min(BOARD_WIDTH - 2, cursor_col + 1)
        elif ch in ("z", "Z"):
            cursor_rot = (cursor_rot - 1) % 4
        elif ch in ("x", "X"):
            cursor_rot = (cursor_rot + 1) % 4
        elif ch in (" ", "\r", "\n"):
            action = cursor_col * 4 + cursor_rot
            _, _, terminated, _, info = env.step(action)
            actions.append([cursor_col, cursor_rot])
            done = terminated
            cursor_col = 7
            cursor_rot = 0
        elif ch in ("q", "Q"):
            break

    # Render final board
    final_frame = _render_play(env, cursor_col, cursor_rot)
    print("\033[2J\033[H", end="")
    print(final_frame)

    final_score = env._state.score
    blocks_placed = env._blocks_placed
    print(f"\nGame over! Score: {final_score}  Blocks: {blocks_placed}")

    if actions:
        path = _save_demo(demos_dir, seed, actions, final_score, blocks_placed)
        print(f"Demo saved → {path}")
    else:
        print("No moves recorded, demo not saved.")
```

**Step 2: Smoke-test manually**

```bash
cd /Users/gordon/Playground/react-lumines/master
python python/play.py --seed 1
```

Play a few moves and press `q`. Verify a JSON file appears in `python/demos/`.

**Step 3: Commit**

```bash
git add python/play.py
git commit -m "feat(play): add game loop and keyboard input"
```

---

### Task 4: Demo save + CLI

**Files:**
- Modify: `python/play.py`
- Modify: `python/tests/test_play.py`

**Step 1: Write the failing test**

Add to `python/tests/test_play.py`:

```python
import json, tempfile, os

def test_save_demo_creates_file():
    from play import _save_demo
    with tempfile.TemporaryDirectory() as tmpdir:
        path = _save_demo(tmpdir, seed="99", actions=[[7, 0], [3, 2]], final_score=100, blocks_placed=2)
        assert os.path.exists(path)
        with open(path) as f:
            data = json.load(f)
        assert data["seed"] == "99"
        assert data["actions"] == [[7, 0], [3, 2]]
        assert data["final_score"] == 100
        assert data["version"] == 1
```

**Step 2: Run test to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_play.py::test_save_demo_creates_file -v
```

Expected: `ImportError` — `_save_demo` not defined yet

**Step 3: Implement `_save_demo` and CLI**

Add to `python/play.py`:

```python
def _save_demo(
    demos_dir: str,
    seed: str,
    actions: list,
    final_score: int,
    blocks_placed: int,
) -> str:
    """Save demo to demos_dir/<seed>_<timestamp>.json. Returns path."""
    os.makedirs(demos_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{seed}_{timestamp}.json"
    path = os.path.join(demos_dir, filename)
    data = {
        "version": 1,
        "seed": seed,
        "actions": actions,
        "final_score": final_score,
        "blocks_placed": blocks_placed,
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return path


if __name__ == "__main__":
    import random

    parser = argparse.ArgumentParser(description="Play Lumines and record a demo")
    parser.add_argument("--seed", default=None, help="Game seed (default: random)")
    parser.add_argument(
        "--demos-dir",
        dest="demos_dir",
        default="python/demos",
        help="Directory to save demo JSON files",
    )
    args = parser.parse_args()

    seed = args.seed if args.seed is not None else str(random.randint(0, 999_999))
    play(seed=seed, demos_dir=args.demos_dir)
```

Also add `import argparse` and `import os` at the top if not already present.

**Step 4: Run test**

```bash
python/.venv/bin/pytest python/tests/test_play.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add python/play.py python/tests/test_play.py
git commit -m "feat(play): add demo save and CLI entry point"
```

---

### Task 5: `extract_demos.py`

**Files:**
- Create: `python/extract_demos.py`
- Create: `python/tests/test_extract_demos.py`

**Step 1: Write the failing test**

```python
# python/tests/test_extract_demos.py
import sys, os, json, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _write_demo(tmpdir, seed, actions, score=0, blocks=None):
    data = {
        "version": 1,
        "seed": seed,
        "actions": actions,
        "final_score": score,
        "blocks_placed": blocks or len(actions),
    }
    path = os.path.join(tmpdir, f"{seed}_demo.json")
    with open(path, "w") as f:
        json.dump(data, f)
    return path


def test_replay_demo_produces_correct_action_count():
    from extract_demos import replay_demo
    with tempfile.TemporaryDirectory() as tmpdir:
        actions = [[7, 0], [3, 1], [10, 2]]
        path = _write_demo(tmpdir, seed="42", actions=actions)
        pairs = replay_demo(path)
        # One (obs, action) pair per action taken (stops when game ends or actions exhausted)
        assert len(pairs) == len(actions)


def test_replay_demo_action_values_match():
    from extract_demos import replay_demo
    with tempfile.TemporaryDirectory() as tmpdir:
        actions = [[7, 0], [3, 1]]
        path = _write_demo(tmpdir, seed="42", actions=actions)
        pairs = replay_demo(path)
        # action stored as integer: col * 4 + rot
        assert pairs[0][1] == 7 * 4 + 0
        assert pairs[1][1] == 3 * 4 + 1


def test_build_dataset_saves_npz():
    import numpy as np
    from extract_demos import build_dataset
    with tempfile.TemporaryDirectory() as tmpdir:
        _write_demo(tmpdir, seed="1", actions=[[7, 0], [3, 1]])
        _write_demo(tmpdir, seed="2", actions=[[5, 2]])
        out_path = os.path.join(tmpdir, "dataset.npz")
        build_dataset(demos_dir=tmpdir, output_path=out_path)
        assert os.path.exists(out_path)
        data = np.load(out_path, allow_pickle=True)
        assert "actions" in data
        assert len(data["actions"]) == 3  # 2 + 1 total pairs
```

**Step 2: Run test to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_extract_demos.py -v
```

Expected: `ModuleNotFoundError: No module named 'extract_demos'`

**Step 3: Implement `python/extract_demos.py`**

```python
"""
extract_demos.py — Convert recorded demo JSONs into a numpy (obs, action) dataset.

Usage:
    python python/extract_demos.py                         # process python/demos/*.json
    python python/extract_demos.py --demos-dir my_demos    # custom input dir
    python python/extract_demos.py --output dataset.npz    # custom output path

Output: numpy .npz file with keys matching the observation space keys, plus 'actions'.
Each row i corresponds to one (obs, action) pair from a human demo.
"""

import argparse
import glob
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from game.env import LuminesEnvNative


def replay_demo(demo_path: str) -> list[tuple[dict, int]]:
    """Replay a demo JSON and return list of (obs, action) pairs.

    Stops when the game ends or all recorded actions are exhausted.
    """
    with open(demo_path) as f:
        data = json.load(f)

    seed = data["seed"]
    actions = data["actions"]  # list of [col, rot]

    env = LuminesEnvNative(mode="per_block", seed=seed)
    obs, _ = env.reset(seed=int(seed) if seed.isdigit() else None)

    pairs = []
    for col, rot in actions:
        action_int = col * 4 + rot
        pairs.append((obs, action_int))
        obs, _, done, _, _ = env.step(action_int)
        if done:
            break

    env.close()
    return pairs


def build_dataset(demos_dir: str, output_path: str) -> None:
    """Process all JSON demos in demos_dir and save a numpy dataset."""
    demo_files = sorted(glob.glob(os.path.join(demos_dir, "*.json")))
    if not demo_files:
        print(f"No demo files found in {demos_dir}")
        return

    all_pairs = []
    for path in demo_files:
        print(f"  Replaying {os.path.basename(path)} ...", end=" ", flush=True)
        try:
            pairs = replay_demo(path)
            all_pairs.extend(pairs)
            print(f"{len(pairs)} steps")
        except Exception as e:
            print(f"SKIP ({e})")

    if not all_pairs:
        print("No pairs collected.")
        return

    # Stack observations key-by-key
    obs_keys = list(all_pairs[0][0].keys())
    stacked_obs = {
        k: np.array([pair[0][k] for pair in all_pairs]) for k in obs_keys
    }
    actions = np.array([pair[1] for pair in all_pairs], dtype=np.int32)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    np.savez_compressed(output_path, actions=actions, **stacked_obs)
    print(f"\nSaved {len(all_pairs)} (obs, action) pairs → {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert demo JSONs to numpy dataset")
    parser.add_argument("--demos-dir", dest="demos_dir", default="python/demos")
    parser.add_argument(
        "--output",
        default=None,
        help="Output .npz path (default: <demos-dir>/dataset.npz)",
    )
    args = parser.parse_args()
    output = args.output or os.path.join(args.demos_dir, "dataset.npz")
    build_dataset(demos_dir=args.demos_dir, output_path=output)
```

**Step 4: Run tests**

```bash
python/.venv/bin/pytest python/tests/test_extract_demos.py -v
```

Expected: all PASS

**Step 5: Run full test suite to check for regressions**

```bash
python/.venv/bin/pytest python/tests/ -v
```

Expected: all existing tests still PASS

**Step 6: Commit**

```bash
git add python/extract_demos.py python/tests/test_extract_demos.py
git commit -m "feat(demos): add extract_demos script with replay and dataset building"
```

---

## Smoke Test (end-to-end)

```bash
# Play one game
python python/play.py --seed 7 --demos-dir /tmp/test_demos

# Extract dataset
python python/extract_demos.py --demos-dir /tmp/test_demos --output /tmp/test_demos/dataset.npz

# Inspect
python -c "
import numpy as np
d = np.load('/tmp/test_demos/dataset.npz', allow_pickle=True)
print('keys:', list(d.keys()))
print('actions shape:', d['actions'].shape)
print('light_board shape:', d['light_board'].shape)
"
```
