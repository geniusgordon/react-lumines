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
