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
    events[50].value = 1000.0
    curve = percentile_curve(events)
    assert curve[5] < 200


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
    assert "last 5" not in out


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
    ea = _make_ea({"rollout/ep_peak_combo_len_mean": [0.0] * 20})
    assess(ea)
    out = capsys.readouterr().out
    assert "combo" in out.lower()
