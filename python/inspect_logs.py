"""
Inspect TensorBoard training logs for the Lumines RL training pipeline.

Usage:
    python python/inspect_logs.py                    # inspect latest PPO run
    python python/inspect_logs.py python/logs/PPO_2  # inspect a specific run
"""

import sys
from pathlib import Path

try:
    from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
except ImportError:
    print("tensorboard not installed. Run: pip install tensorboard")
    sys.exit(1)


def percentile_curve(events, n_points=11):
    """Return smoothed values at n_points evenly-spaced percentiles (0%..100%).

    Each point is the mean of the ~10% of events nearest to that percentile
    mark, which smooths noise while preserving trend shape.
    """
    if not events:
        return []
    if len(events) == 1:
        return [events[0].value] * n_points

    vals = [e.value for e in events]
    N = len(vals)
    window = max(1, N // 10)
    result = []
    for i in range(n_points):
        center = round(i / (n_points - 1) * (N - 1))
        lo = max(0, center - window // 2)
        hi = min(N, lo + window)
        # ensure window doesn't shrink at edges
        if hi - lo < window and lo > 0:
            lo = max(0, hi - window)
        result.append(sum(vals[lo:hi]) / (hi - lo))
    return result


TAGS_OF_INTEREST = [
    # --- rollout (game) ---
    "rollout/ep_rew_mean",
    "rollout/ep_game_score_mean",
    "rollout/ep_game_score_max",
    "rollout/ep_peak_combo_len_mean",
    "rollout/ep_peak_combo_len_max",
    "rollout/ep_len_mean",
    # --- eval ---
    "eval/mean_reward",
    "eval/mean_game_score",
    "eval/max_game_score",
    "eval/mean_ep_length",
    # --- train ---
    "train/explained_variance",
    "train/entropy_loss",
    "train/value_loss",
    "train/policy_gradient_loss",
    "train/approx_kl",
    "train/clip_fraction",
    "train/learning_rate",
    # --- rnd (only present in RND runs) ---
    "rnd/mean_r_int",
    "rnd/r_int_std",
    "rnd/predictor_loss",
    # --- infrastructure ---
    "time/fps",
]


def find_latest_log_dir(base: Path) -> Path:
    runs = sorted(base.glob("PPO_*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not runs:
        raise FileNotFoundError(f"No PPO_* directories found in {base}")
    return runs[0]


def summarize(ea: EventAccumulator, tag: str) -> None:
    if tag not in ea.Tags().get("scalars", []):
        return
    events = ea.Scalars(tag)
    if not events:
        return

    steps = [e.step for e in events]
    vals = [e.value for e in events]
    peak_idx = vals.index(max(vals))

    curve = percentile_curve(events)
    curve_str = "→".join(f"{v:>6.1f}" for v in curve)
    pct_labels = "  ".join(f"{i*10:>5}%" for i in range(11))

    print(f"  {tag}")
    print(f"    steps : {steps[0]:>10,} → {steps[-1]:>10,}  ({len(steps)} points)")
    print(f"    values: first={vals[0]:.4f}  last={vals[-1]:.4f}"
          f"  min={min(vals):.4f}  max={max(vals):.4f}  (peak @ step {steps[peak_idx]:,})")
    print(f"    curve : {curve_str}")
    print(f"             {pct_labels}")


def assess(ea: EventAccumulator) -> None:
    """Print a quick health assessment of the run."""
    scalars = ea.Tags().get("scalars", [])

    def last_val(tag):
        if tag not in scalars:
            return None
        events = ea.Scalars(tag)
        return events[-1].value if events else None

    def trend(tag, n=10):
        """Return (first_half_mean, second_half_mean) for the last n points."""
        if tag not in scalars:
            return None, None
        events = ea.Scalars(tag)[-n:]
        if len(events) < 4:
            return None, None
        mid = len(events) // 2
        first = sum(e.value for e in events[:mid]) / mid
        second = sum(e.value for e in events[mid:]) / (len(events) - mid)
        return first, second

    print("\n=== HEALTH ASSESSMENT ===")

    ev = last_val("train/explained_variance")
    if ev is not None:
        flag = "GOOD" if ev > 0.6 else ("OK" if ev > 0.3 else "POOR")
        print(f"  Explained variance : {ev:.3f}  [{flag}]  (target >0.6)")

    ent = last_val("train/entropy_loss")
    if ent is not None:
        flag = "COLLAPSED" if ent > -1.0 else ("LOW" if ent > -2.0 else "OK")
        print(f"  Entropy loss       : {ent:.3f}  [{flag}]  (more negative = more exploration)")

    pg = last_val("train/policy_gradient_loss")
    if pg is not None:
        flag = "STALLED" if abs(pg) < 0.001 else "OK"
        print(f"  Policy grad loss   : {pg:.4f}  [{flag}]")

    kl = last_val("train/approx_kl")
    if kl is not None:
        flag = "HIGH" if kl > 0.1 else "OK"
        print(f"  Approx KL          : {kl:.4f}  [{flag}]  (target <0.01–0.05)")

    cf = last_val("train/clip_fraction")
    if cf is not None:
        flag = "HIGH" if cf > 0.3 else "OK"
        print(f"  Clip fraction      : {cf:.3f}  [{flag}]  (target <0.1–0.2; high = LR too large)")

    # --- reward trend ---
    f, s = trend("rollout/ep_rew_mean")
    if f is not None:
        direction = "UP" if s > f * 1.02 else ("DOWN" if s < f * 0.98 else "FLAT")
        print(f"  Reward trend (last 10): {f:.3f} → {s:.3f}  [{direction}]")

    f, s = trend("eval/mean_reward")
    if f is not None:
        direction = "UP" if s > f * 1.02 else ("DOWN" if s < f * 0.98 else "FLAT")
        print(f"  Eval reward trend  : {f:.3f} → {s:.3f}  [{direction}]")

    # --- game score (true objective) ---
    f, s = trend("eval/mean_game_score")
    if f is not None:
        direction = "UP" if s > f * 1.02 else ("DOWN" if s < f * 0.98 else "FLAT")
        print(f"  Game score trend   : {f:.1f} → {s:.1f}  [{direction}]")

    gs = last_val("eval/mean_game_score")
    if gs is not None:
        print(f"  Last eval game score: {gs:.1f}")

    # --- combo mechanic ---
    combo = last_val("rollout/ep_peak_combo_len_mean")
    if combo is not None:
        flag = "NOT DISCOVERED" if combo < 0.5 else ("LOW" if combo < 2.0 else "OK")
        print(f"  Peak combo len     : {combo:.2f}  [{flag}]  (>2 = agent builds combos)")

    # --- RND (only present in RND runs) ---
    pred_loss = last_val("rnd/predictor_loss")
    if pred_loss is not None:
        f_p, s_p = trend("rnd/predictor_loss")
        direction = "DECREASING" if (f_p and s_p and s_p < f_p * 0.95) else "FLAT/STUCK"
        r_int = last_val("rnd/mean_r_int")
        r_int_str = f"  r_int={r_int:.4f}" if r_int is not None else ""
        print(f"  RND predictor loss : {pred_loss:.4f}  [{direction}]{r_int_str}")


def main() -> None:
    base = Path("python/logs")
    if len(sys.argv) > 1:
        log_dir = Path(sys.argv[1])
    else:
        log_dir = find_latest_log_dir(base)

    print(f"Loading logs from: {log_dir}")
    ea = EventAccumulator(str(log_dir))
    ea.Reload()

    total_steps = 0
    if "rollout/ep_rew_mean" in ea.Tags().get("scalars", []):
        events = ea.Scalars("rollout/ep_rew_mean")
        if events:
            total_steps = events[-1].step
    print(f"Total steps logged : {total_steps:,}\n")

    print("=== SCALARS ===")
    for tag in TAGS_OF_INTEREST:
        summarize(ea, tag)
        print()

    assess(ea)


if __name__ == "__main__":
    main()
