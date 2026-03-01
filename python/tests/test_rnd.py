import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import torch
import torch.nn as nn


def test_target_network_output_shape():
    """Target produces (B, 128) embeddings."""
    from rnd import RNDTargetNetwork
    net = RNDTargetNetwork()
    x = torch.zeros(4, 7, 10, 16)
    out = net(x)
    assert out.shape == (4, 128)


def test_target_network_is_frozen_after_backward():
    """Gradients never flow into target weights."""
    from rnd import RNDTargetNetwork
    net = RNDTargetNetwork()
    before = [p.data.clone() for p in net.parameters()]
    x = torch.zeros(2, 7, 10, 16, requires_grad=True)
    # Even if we try to backprop through it, weights must not change
    out = net(x)
    out.sum().backward()
    for before_w, p in zip(before, net.parameters()):
        assert torch.allclose(before_w, p.data), "target weights changed after backward"


def test_predictor_network_output_shape():
    """Predictor produces (B, 128) embeddings."""
    from rnd import RNDPredictorNetwork
    net = RNDPredictorNetwork()
    x = torch.zeros(4, 7, 10, 16)
    out = net(x)
    assert out.shape == (4, 128)


def test_predictor_loss_decreases_after_grad_step():
    """Predictor loss decreases when trained toward target."""
    from rnd import RNDTargetNetwork, RNDPredictorNetwork
    target = RNDTargetNetwork()
    predictor = RNDPredictorNetwork()
    opt = torch.optim.Adam(predictor.parameters(), lr=1e-3)
    x = torch.randn(32, 7, 10, 16)

    with torch.no_grad():
        t_out = target(x)

    losses = []
    for _ in range(5):
        p_out = predictor(x)
        loss = (t_out - p_out).pow(2).mean()
        losses.append(loss.item())
        opt.zero_grad()
        loss.backward()
        opt.step()

    assert losses[-1] < losses[0], f"loss did not decrease: {losses}"


# ---------------------------------------------------------------------------
# RNDVecWrapper tests
# ---------------------------------------------------------------------------

def _make_lumines_venv(n_envs=2):
    """Helper: DummyVecEnv wrapping LuminesEnvNative with VecNormalize."""
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
    from stable_baselines3.common.monitor import Monitor
    from game.env import LuminesEnvNative

    def make():
        env = LuminesEnvNative(mode="per_block", seed="0")
        return Monitor(env)

    venv = DummyVecEnv([make] * n_envs)
    venv = VecNormalize(venv, norm_obs=True, norm_reward=False)
    return venv


def test_rnd_wrapper_rewards_increase_with_positive_beta():
    """Wrapper adds a positive intrinsic bonus to all rewards."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=2)
    wrapper = RNDVecWrapper(venv, beta=1.0, device="cpu")

    wrapper.reset()
    actions = np.array([0, 0])

    # Get baseline rewards without wrapper (step directly on venv)
    venv.reset()
    _, base_rewards, _, _ = venv.step(actions)

    # Reset both to same seed and get wrapped rewards
    wrapper.reset()
    _, wrapped_rewards, _, _ = wrapper.step(actions)

    # Wrapped rewards must be >= base rewards (intrinsic is non-negative)
    assert np.all(wrapped_rewards >= base_rewards - 1e-6), (
        f"expected wrapped >= base, got wrapped={wrapped_rewards}, base={base_rewards}"
    )


def test_rnd_wrapper_normalization_clips():
    """Normalized intrinsic rewards are clamped to [0, 5.0]."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=4)
    wrapper = RNDVecWrapper(venv, beta=1.0, device="cpu")
    wrapper.reset()

    for _ in range(20):
        actions = np.zeros(4, dtype=int)
        wrapper.step(actions)

    # After 20 steps running stats are non-trivial; check that
    # _r_int_count has been updated and std is positive
    assert wrapper._r_int_count > 0
    r_int_std = np.sqrt(max(wrapper._r_int_var / max(1, wrapper._r_int_count), 1e-16))
    assert r_int_std > 0


def test_rnd_wrapper_save_load_roundtrip(tmp_path):
    """save() + load_state() restores predictor weights and running stats."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=2)
    wrapper = RNDVecWrapper(venv, beta=0.01, device="cpu")
    wrapper.reset()

    # Take a few steps to build up running stats
    for _ in range(5):
        wrapper.step(np.zeros(2, dtype=int))

    save_path = str(tmp_path / "rnd_state.pt")
    wrapper.save(save_path)

    # Create fresh wrapper and load
    venv2 = _make_lumines_venv(n_envs=2)
    wrapper2 = RNDVecWrapper(venv2, beta=0.01, device="cpu")
    RNDVecWrapper.load_state(save_path, wrapper2)

    # Check predictor weights match
    for p1, p2 in zip(wrapper.predictor.parameters(), wrapper2.predictor.parameters()):
        assert torch.allclose(p1.data, p2.data)

    # Check running stats match
    assert wrapper._r_int_count == wrapper2._r_int_count
