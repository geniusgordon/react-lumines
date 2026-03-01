def test_reward_formula():
    """PPO_35: total = score_delta + death."""
    from game.env import LuminesEnvNative
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    for action in range(100):
        _, reward, done, _, info = env.step(action % 60)
        if "reward_components" in info:
            rc = info["reward_components"]
            expected = rc["score_delta"] + rc["death"]
            residual = abs(rc["total"] - expected)
            assert residual < 1e-6, (
                f"PPO_35 reward formula mismatch at action {action}; residual={residual}"
            )
        if done:
            env.reset()
