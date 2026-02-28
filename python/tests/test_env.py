def test_ppo33_reward_formula():
    """PPO_33: total = score_delta + chain_delta_any_color*0.03 + post_sweep_light_delta*0.05 + post_sweep_dark_delta*0.05 + death."""
    from game.env import LuminesEnvNative
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    for action in range(100):
        _, reward, done, _, info = env.step(action % 60)
        if "reward_components" in info:
            rc = info["reward_components"]
            expected = (
                rc["score_delta"]
                + rc["chain_delta_any_color"] * 0.03
                + rc["post_sweep_light_delta"] * 0.05
                + rc["post_sweep_dark_delta"] * 0.05
                + rc["death"]
            )
            residual = abs(rc["total"] - expected)
            assert residual < 1e-6, (
                f"PPO_33 reward formula mismatch at action {action}; residual={residual}"
            )
        if done:
            env.reset()
