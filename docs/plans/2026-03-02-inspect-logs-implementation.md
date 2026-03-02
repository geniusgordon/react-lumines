# inspect_logs.py Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve `python/inspect_logs.py` to cover all logged metrics and replace the last-5 display with a smoothed 11-point percentile curve.

**Architecture:** Four self-contained changes to a single script: (1) add a `percentile_curve()` pure function, (2) update `summarize()` to use it, (3) expand `TAGS_OF_INTEREST`, (4) improve `assess()` with game-score and RND checks. Tests live in `python/tests/test_inspect_logs.py`.

**Tech Stack:** Python stdlib only (`pathlib`, `sys`); `tensorboard` (already a dependency).

---

### Task 1: Add `percentile_curve()` with tests

**Files:**
- Create: `python/tests/test_inspect_logs.py`
- Modify: `python/inspect_logs.py` (add function after imports, before `TAGS_OF_INTEREST`)

**Step 1: Write the failing test**

```python
# python/tests/test_inspect_logs.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from inspect_logs import percentile_curve

class FakeEvent:
    def __init__(self, step, value):
        self.step = step
        self.value = value


def test_percentile_curve_returns_11_points():
    events = [FakeEvent(i, float(i)) for i in range(100)]
    result = percentile_curve(events)
    assert len(result) == 11


def test_percentile_curve_monotone_on_linear_data():
    """A perfectly linear signal should produce a non-decreasing curve."""
    events = [FakeEvent(i, float(i)) for i in range(100)]
    curve = percentile_curve(events)
    assert all(curve[i] <= curve[i+1] + 0.01 for i in range(10))


def test_percentile_curve_first_and_last():
    """First point ≈ first value, last point ≈ last value."""
    events = [FakeEvent(i, float(i)) for i in range(50)]
    curve = percentile_curve(events)
    # first point should be near 0, last near 49
    assert curve[0] < 10
    assert curve[-1] > 40


def test_percentile_curve_single_event():
    events = [FakeEvent(0, 42.0)]
    curve = percentile_curve(events)
    assert len(curve) == 11
    assert all(v == 42.0 for v in curve)


def test_percentile_curve_smooths_spike():
    """A single outlier spike should not dominate the surrounding percentile point."""
    events = [FakeEvent(i, 1.0) for i in range(100)]
    events[50].value = 1000.0  # spike at midpoint
    curve = percentile_curve(events)
    # the 50% bucket averages ~10 points; spike contributes ~1/10 → well below 100
    assert curve[5] < 200
```

**Step 2: Run test to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py -v
```

Expected: `ImportError: cannot import name 'percentile_curve' from 'inspect_logs'`

**Step 3: Implement `percentile_curve()`**

Add this function to `python/inspect_logs.py` immediately after the `try/except` import block and before `TAGS_OF_INTEREST`:

```python
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
```

**Step 4: Run tests to verify they pass**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py -v
```

Expected: 5 tests pass.

**Step 5: Commit**

```bash
git add python/inspect_logs.py python/tests/test_inspect_logs.py
git commit -m "feat(inspect_logs): add percentile_curve helper with tests"
```

---

### Task 2: Update `summarize()` to use the curve

**Files:**
- Modify: `python/inspect_logs.py:40-52` (the `summarize()` function)

**Step 1: Write a test for the formatted output**

Add to `python/tests/test_inspect_logs.py`:

```python
def test_summarize_outputs_curve_line(capsys):
    from inspect_logs import summarize
    from unittest.mock import MagicMock

    events = [FakeEvent(i * 1000, float(i)) for i in range(20)]

    ea = MagicMock()
    ea.Tags.return_value = {"scalars": ["my/metric"]}
    ea.Scalars.return_value = events

    summarize(ea, "my/metric")
    out = capsys.readouterr().out
    assert "curve" in out
    assert "→" in out
    # should NOT contain the old "last 5" label
    assert "last 5" not in out
```

**Step 2: Run to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py::test_summarize_outputs_curve_line -v
```

Expected: FAIL — output contains "last 5", not "curve".

**Step 3: Replace `summarize()` body**

Replace the current `summarize()` function in `python/inspect_logs.py`:

```python
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
```

**Step 4: Run all tests**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py -v
```

Expected: all pass.

**Step 5: Smoke-test visually**

```bash
"python/.venv/bin/python" python/inspect_logs.py
```

Verify the curve line and percentile labels appear for each metric.

**Step 6: Commit**

```bash
git add python/inspect_logs.py python/tests/test_inspect_logs.py
git commit -m "feat(inspect_logs): replace last-5 with smoothed percentile curve"
```

---

### Task 3: Expand `TAGS_OF_INTEREST`

**Files:**
- Modify: `python/inspect_logs.py:19-30` (the `TAGS_OF_INTEREST` list)

No new tests needed — coverage comes from the smoke-test and the tag list is just data.

**Step 1: Replace `TAGS_OF_INTEREST`**

```python
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
```

**Step 2: Smoke-test**

```bash
"python/.venv/bin/python" python/inspect_logs.py
```

Verify game score and combo-len metrics now appear in the output. RND metrics should appear for PPO_38/PPO_39 and be silently skipped for older runs (existing `summarize()` returns early when a tag is absent).

**Step 3: Commit**

```bash
git add python/inspect_logs.py
git commit -m "feat(inspect_logs): add game score, combo-len, RND, and FPS metrics"
```

---

### Task 4: Update `assess()` with game-score and RND checks

**Files:**
- Modify: `python/inspect_logs.py:55-113` (the `assess()` function)

**Step 1: Write tests for new assessment signals**

Add to `python/tests/test_inspect_logs.py`:

```python
def _make_ea(tag_values: dict):
    """Build a mock EventAccumulator from {tag: [value, ...]} dict."""
    from unittest.mock import MagicMock
    ea = MagicMock()
    ea.Tags.return_value = {"scalars": list(tag_values.keys())}
    def scalars_side_effect(tag):
        return [FakeEvent(i, v) for i, v in enumerate(tag_values[tag])]
    ea.Scalars.side_effect = scalars_side_effect
    return ea


def test_assess_game_score_improving(capsys):
    from inspect_logs import assess
    vals = list(range(1, 21))  # steadily rising
    ea = _make_ea({"eval/mean_game_score": vals})
    assess(ea)
    out = capsys.readouterr().out
    assert "game score" in out.lower() or "mean_game_score" in out.lower()


def test_assess_rnd_predictor_loss_shown(capsys):
    from inspect_logs import assess
    vals = [1.0, 0.9, 0.8, 0.7, 0.6]
    ea = _make_ea({"rnd/predictor_loss": vals})
    assess(ea)
    out = capsys.readouterr().out
    assert "predictor" in out.lower()


def test_assess_combo_len_zero_flagged(capsys):
    from inspect_logs import assess
    # all zeros → agent never built a combo
    ea = _make_ea({"rollout/ep_peak_combo_len_mean": [0.0] * 20})
    assess(ea)
    out = capsys.readouterr().out
    assert "combo" in out.lower()
```

**Step 2: Run to verify they fail**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py::test_assess_game_score_improving python/tests/test_inspect_logs.py::test_assess_rnd_predictor_loss_shown python/tests/test_inspect_logs.py::test_assess_combo_len_zero_flagged -v
```

Expected: 3 failures.

**Step 3: Update `assess()`**

Replace the `assess()` function body in `python/inspect_logs.py`. Keep all existing checks; add the new ones below `kl`/`clip_fraction`:

```python
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
```

**Step 4: Run all tests**

```bash
python/.venv/bin/pytest python/tests/test_inspect_logs.py -v
```

Expected: all tests pass.

**Step 5: Final smoke-test on a real run**

```bash
"python/.venv/bin/python" python/inspect_logs.py python/logs/PPO_39
"python/.venv/bin/python" python/inspect_logs.py python/logs/PPO_35
```

Verify:
- PPO_39 shows RND section in health assessment
- PPO_35 skips RND section silently
- All game score / combo-len metrics appear in both

**Step 6: Commit**

```bash
git add python/inspect_logs.py python/tests/test_inspect_logs.py
git commit -m "feat(inspect_logs): add game score, combo, and RND health checks to assess()"
```
