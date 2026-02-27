def test_adjacent_patterns_reward_weight():
    """adjacent_patterns_created contribution uses 0.05 weight in PPO_18."""
    from game.env import LuminesEnvNative
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Run steps and collect reward_components when adjacent_patterns_created > 0
    found_adjacent = False
    for action in range(500):
        _, _, done, _, info = env.step(action % 60)
        if "reward_components" in info:
            rc = info["reward_components"]
            if rc["adjacent_patterns_created"] > 0:
                found_adjacent = True
                implied_weight = rc["total"] - (
                    rc["score_delta"]
                    + rc["patterns_created"] * 0.05
                    + rc["height_delta"]
                    + rc["holding_score_reward"]
                    + rc["adjacent_patterns_created"] * 0.05
                    + rc["chain_delta_reward"]
                    + rc["projected_chain_reward"]
                    + rc["post_sweep_pattern_delta"]
                    + rc["death_penalty"]
                )
                assert abs(implied_weight) < 1e-6, (
                    f"adjacent_patterns weight is not 0.05; residual={implied_weight}"
                )
        if done:
            env.reset()
    assert found_adjacent, "No adjacent_patterns_created > 0 occurred; seed or step count may need adjustment"
