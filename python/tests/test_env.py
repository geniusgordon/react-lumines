def test_potential_reward_formula():
    """PPO_34: total = score_delta + PATTERN_LAMBDA * patterns_formed + death."""
    from game.env import LuminesEnvNative, PATTERN_LAMBDA
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    for action in range(100):
        _, reward, done, _, info = env.step(action % 60)
        if "reward_components" in info:
            rc = info["reward_components"]
            expected = (
                rc["score_delta"]
                + PATTERN_LAMBDA * rc["patterns_formed"]
                + rc["death"]
            )
            residual = abs(rc["total"] - expected)
            assert residual < 1e-6, (
                f"PPO_34 reward formula mismatch at action {action}; residual={residual}"
            )
        if done:
            env.reset()
