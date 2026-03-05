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
