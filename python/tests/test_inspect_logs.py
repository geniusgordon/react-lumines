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
