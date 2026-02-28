# RL Algorithm Exploration for Lumines Agent

Date: 2026-02-28

## Environment Characteristics

- **Action space**: Discrete(60) per-block mode (15 cols × 4 rotations), Discrete(7) per-frame
- **Observations**: Multi-channel spatial board (light_board, dark_board, light_pattern_board, dark_pattern_board) + scalar features
- **Reward**: Shaped — score delta + single-color chain delta + post-sweep chain level + death penalty
- **Partial observability**: Agent sees current block + 3 upcoming queue blocks only. Future blocks are unknown at decision time, even though the seed fully determines the sequence.
- **Effective planning horizon**: 4 blocks max

## Algorithm Candidates

### PPO + LSTM (Recurrent PPO)
- **Type**: On-policy, model-free
- **Why**: Recurrent state helps compensate for partial observability. Agent can track board trends ("chain is building") implicitly across steps.
- **Fit**: Best simplest path forward. Fast to train, stable baseline.
- **SB3 support**: `sb3-contrib.RecurrentPPO`
- **Watch for**: Early plateau → local optimum, tune entropy coefficient

### SAC-Discrete
- **Type**: Off-policy, model-free
- **Why**: Entropy regularization encourages exploration of diverse placements. Replay buffer lets it reuse rare high-score experiences from sparse scoring events.
- **Fit**: Best model-free ceiling candidate. Often outperforms PPO on puzzles where uniform exploration is costly.
- **Watch for**: Early instability → Q-networks diverging, reduce learning rate

### DreamerV3
- **Type**: Model-based (learns a latent world model)
- **Why**: Learns to predict board consequences without needing full future knowledge. Recurrent latent state encodes long-horizon board dynamics.
- **Fit**: Highest ceiling, most complex. Worth investing only if model-free methods plateau.
- **Library**: `sheeprl` or `dreamer-pytorch`
- **Watch for**: High world model reconstruction loss → increase latent/model capacity

## Why MCTS / MuZero Was Ruled Out

Although the game is deterministic given a seed, the agent only observes 4 blocks at a time. Planning beyond 4 steps hits unknown future blocks, making shallow MCTS search trees insufficient to justify the added complexity. The determinism advantage is largely inaccessible.

## Comparison Methodology

### Metrics

| Metric | Purpose |
|--------|---------|
| Mean episode score | Primary objective |
| Score per block placed | Placement quality, independent of episode length |
| Survival time (blocks/frames) | Separates good play from long play |
| Chain frequency | How often agent sets up multi-block sweeps |
| Sample efficiency (score vs env steps) | Wall-clock performance at scale |

### Experimental Controls

- Same seeds for train/eval splits
- Same CNN feature extractor architecture across all 3
- Same `blocks_per_sweep` setting
- Fixed eval: 20 episodes with fixed seeds, every 100K–500K training steps
- Compare **score vs env steps** (not wall time — DreamerV3 is slower per step)

### Training Budget

```bash
python train.py --algo ppo  --recurrent --steps 5_000_000
python train.py --algo sacd --steps 5_000_000
python train.py --algo dreamer --steps 5_000_000
```

### What Each Experiment Reveals

- **PPO+LSTM** → Does recurrence help over flat PPO? Establishes baseline ceiling fast.
- **SAC-Discrete** → Does entropy-driven exploration find better placements than PPO?
- **DreamerV3** → Does a world model outperform reactive policies given only 4-block foresight?

## Recommended Progression

1. **PPO+LSTM first** — establishes baseline quickly, low implementation cost
2. **SAC-Discrete second** — same codebase complexity, swap the algo
3. **DreamerV3 last** — only if model-free ceiling looks insufficient
