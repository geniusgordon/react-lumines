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


def obs_to_numpy(obs_json: dict) -> dict:
    bp = obs_json["blockPosition"]
    return {
        "board": np.array(obs_json["board"], dtype=np.int8),
        "current_block": np.array(obs_json["currentBlock"], dtype=np.int8),
        "block_position": np.array([bp["x"], bp["y"]], dtype=np.int32),
        "queue": np.array(obs_json["queue"], dtype=np.int8),
        "timeline_x": np.array([obs_json["timelineX"]], dtype=np.int32),
        "score": np.array([obs_json["score"]], dtype=np.int32),
        "frame": np.array([obs_json["frame"]], dtype=np.int32),
        "game_timer": np.array([obs_json["gameTimer"]], dtype=np.int32),
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
            print(f"Connection error: {e}")
        finally:
            print("Client disconnected")
    return handler


async def main(args):
    from websockets.asyncio.server import serve
    model, vec_normalize = load_model(args.checkpoint, args.device)
    handler = make_handler(model, vec_normalize)
    print(f"Inference server listening on ws://localhost:{args.port}")
    print("Open the browser and navigate to /ai-watch")
    async with serve(handler, "localhost", args.port):
        await asyncio.get_event_loop().run_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebSocket inference server for live AI watch")
    parser.add_argument("--checkpoint", default="python/checkpoints/best_model")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()
    asyncio.run(main(args))
