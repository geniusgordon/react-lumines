"""
ws_eval.py — WebSocket inference server for live AI watch in browser.

Usage:
    python python/ws_eval.py
    python python/ws_eval.py --checkpoint python/checkpoints/best_model
    python python/ws_eval.py --port 8765

The server loads the PPO model, then waits for connections.
Each message: JSON observation → returns action int as string.
"""
import argparse
import asyncio
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from game.env import LuminesEnvNative


def load_model(checkpoint: str, device: str):
    norm_stats_path = os.path.join(os.path.dirname(checkpoint), "vecnormalize.pkl")
    dummy = DummyVecEnv([lambda: LuminesEnvNative(mode="per_block")])
    vec_normalize = None
    if os.path.exists(norm_stats_path):
        print(f"Loading VecNormalize stats from {norm_stats_path}")
        dummy = VecNormalize.load(norm_stats_path, dummy)
        dummy.training = False
        dummy.norm_reward = False
        vec_normalize = dummy
    model = PPO.load(checkpoint, env=dummy, device=device)
    print(f"Model loaded from {checkpoint}")
    return model, vec_normalize


BOARD_HEIGHT, BOARD_WIDTH = 10, 16


def compute_column_heights(board):
    heights = np.zeros(BOARD_WIDTH, dtype=np.float32)
    for col in range(BOARD_WIDTH):
        for row in range(BOARD_HEIGHT):
            if board[row][col] != 0:
                heights[col] = float(BOARD_HEIGHT - row)
                break
    return heights


def compute_pattern_board(board):
    pb = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
    for r in range(BOARD_HEIGHT - 1):
        for c in range(BOARD_WIDTH - 1):
            color = board[r][c]
            if color != 0 and board[r+1][c] == color and board[r][c+1] == color and board[r+1][c+1] == color:
                pb[r][c] += 0.25; pb[r+1][c] += 0.25
                pb[r][c+1] += 0.25; pb[r+1][c+1] += 0.25
    return pb


def compute_ghost_board(board, current_block, block_x):
    ghost = np.array(
        [[1.0 if board[r][c] != 0 else 0.0 for c in range(BOARD_WIDTH)]
         for r in range(BOARD_HEIGHT)],
        dtype=np.float32,
    )
    drop_y = -1
    for y in range(BOARD_HEIGHT):
        collision = False
        for dr in range(2):
            for dc in range(2):
                if current_block[dr][dc] != 0:
                    r, c = y + dr, block_x + dc
                    if r >= BOARD_HEIGHT or c >= BOARD_WIDTH or c < 0 or (r >= 0 and board[r][c] != 0):
                        collision = True
        if collision:
            break
        drop_y = y
    if drop_y >= 0:
        for dr in range(2):
            for dc in range(2):
                if current_block[dr][dc] != 0:
                    r, c = drop_y + dr, block_x + dc
                    if 0 <= r < BOARD_HEIGHT and 0 <= c < BOARD_WIDTH:
                        ghost[r][c] = 1.0
    return ghost


def compute_projected_pattern_board(board, marked_cells):
    """
    Mirror of env._build_projected_pattern_board().
    board is a 2D list (BOARD_HEIGHT × BOARD_WIDTH).
    marked_cells is a list of {x, y} dicts (from the browser JSON obs).
    """
    proj = [row[:] for row in board]
    for cell in marked_cells:
        x, y = cell["x"], cell["y"]
        if 0 <= y < BOARD_HEIGHT and 0 <= x < BOARD_WIDTH:
            proj[y][x] = 0
    # apply gravity: compact each column downward
    new_board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
    for c in range(BOARD_WIDTH):
        col = [proj[r][c] for r in range(BOARD_HEIGHT - 1, -1, -1) if proj[r][c] != 0]
        for i, v in enumerate(col):
            new_board[BOARD_HEIGHT - 1 - i][c] = v
    # build pattern channel
    counts = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
    for r in range(BOARD_HEIGHT - 1):
        for c in range(BOARD_WIDTH - 1):
            v = new_board[r][c]
            if v != 0 and v == new_board[r + 1][c] == new_board[r][c + 1] == new_board[r + 1][c + 1]:
                counts[r][c] += 1; counts[r + 1][c] += 1
                counts[r][c + 1] += 1; counts[r + 1][c + 1] += 1
    return counts / 4.0


def compute_timeline_board(pattern_board, timeline_x):
    result = pattern_board.copy()
    result[:, :timeline_x + 1] = 0.0
    return result


def compute_dominant_color_chain(board) -> float:
    """Longest consecutive single-color pattern-column run, normalised to [0,1].
    Mirrors env._count_max_single_color_chain_from_board() exactly."""
    light_cols: set = set()
    dark_cols: set = set()
    for row in range(BOARD_HEIGHT - 1):
        for col in range(BOARD_WIDTH - 1):
            c = board[row][col]
            if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                (light_cols if c == 1 else dark_cols).add(col)

    def _run(col_set):
        mx = cur = 0
        for c in range(BOARD_WIDTH - 1):
            cur = cur + 1 if c in col_set else 0
            mx = max(mx, cur)
        return mx

    return float(max(_run(light_cols), _run(dark_cols))) / (BOARD_WIDTH - 1)


def compute_color_board(board, color: int) -> np.ndarray:
    """Binary float32 (H×W): 1.0 where board cell == color.
    Mirrors env._build_color_board() exactly."""
    return (np.array(board, dtype=np.float32) == color).astype(np.float32)


def obs_to_numpy(obs_json: dict) -> dict:
    bp = obs_json["blockPosition"]
    board = np.array(obs_json["board"], dtype=np.int8)
    current_block = np.array(obs_json["currentBlock"], dtype=np.int8)
    block_x = int(bp["x"])
    timeline_x = int(obs_json["timelineX"])

    # Pad queue to 3 blocks if browser sends fewer
    raw_queue = list(obs_json["queue"])
    while len(raw_queue) < 3:
        raw_queue.append([[0, 0], [0, 0]])
    queue = np.array(raw_queue[:3], dtype=np.int8)

    pattern_board = compute_pattern_board(board)
    marked_cells = obs_json.get("markedCells", [])

    return {
        "light_board": compute_color_board(board.tolist(), 1),
        "dark_board": compute_color_board(board.tolist(), 2),
        "pattern_board": pattern_board,
        "ghost_board": compute_ghost_board(board, current_block, block_x),
        "timeline_board": compute_timeline_board(pattern_board, timeline_x),
        "current_block": current_block,
        "block_position": np.array([bp["x"], bp["y"]], dtype=np.int32),
        "queue": queue,
        "timeline_x": np.array([timeline_x], dtype=np.int32),
        "score": np.array([obs_json["score"]], dtype=np.int32),
        "frame": np.array([obs_json["frame"]], dtype=np.int32),
        "game_timer": np.array([obs_json["gameTimer"]], dtype=np.int32),
        "column_heights": compute_column_heights(board),
        "holding_score": np.array([min(float(obs_json.get("holdingScore", 0)) / 10.0, 1.0)], dtype=np.float32),
        "dominant_color_chain": np.array([compute_dominant_color_chain(board.tolist())], dtype=np.float32),
        "projected_pattern_board": compute_projected_pattern_board(board.tolist(), marked_cells),
    }


def normalize_obs(vec_normalize, obs: dict) -> dict:
    batched = {k: np.array([v]) for k, v in obs.items()}
    return vec_normalize.normalize_obs(batched)


def make_handler(model, vec_normalize):
    async def handler(websocket):
        print(f"Client connected: {websocket.remote_address}")
        try:
            async for message in websocket:
                obs_json = json.loads(message)
                obs = obs_to_numpy(obs_json)
                predict_obs = normalize_obs(vec_normalize, obs) if vec_normalize else obs
                action, _ = model.predict(predict_obs, deterministic=True)
                action_int = int(action.flat[0])
                await websocket.send(str(action_int))
        except Exception as e:
            import traceback
            print(f"Connection error: {e}")
            traceback.print_exc()
        finally:
            print("Client disconnected")
    return handler


async def main(args):
    from websockets.asyncio.server import serve
    model, vec_normalize = load_model(args.checkpoint, args.device)
    handler = make_handler(model, vec_normalize)
    print(f"Inference server listening on ws://{args.host}:{args.port}")
    print("Open the browser and navigate to /ai-watch")
    async with serve(handler, args.host, args.port):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebSocket inference server for live AI watch")
    parser.add_argument("--checkpoint", default="python/checkpoints/best_model")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()
    asyncio.run(main(args))
