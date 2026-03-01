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
