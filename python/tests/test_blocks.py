"""
test_blocks.py — Port of gameLogic.rotation.test.ts + gameLogic.generation.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.rng import SeededRNG
from python.game.blocks import generate_random_block, rotate_block_pattern


# ---------------------------------------------------------------------------
# Rotation tests (gameLogic.rotation.test.ts)
# ---------------------------------------------------------------------------

def test_rotate_clockwise():
    pattern = [[1, 2], [0, 1]]
    rotated = rotate_block_pattern(pattern, clockwise=True)
    expected = [[0, 1], [1, 2]]
    assert rotated == expected


def test_rotate_counter_clockwise():
    pattern = [[1, 2], [0, 1]]
    rotated = rotate_block_pattern(pattern, clockwise=False)
    expected = [[2, 1], [1, 0]]
    assert rotated == expected


def test_four_clockwise_rotations_identity():
    """Four CW rotations should return to the original pattern."""
    pattern = [[1, 2], [2, 1]]
    result = pattern
    for _ in range(4):
        result = rotate_block_pattern(result, clockwise=True)
    assert result == pattern


# ---------------------------------------------------------------------------
# Generation tests (gameLogic.generation.test.ts)
# ---------------------------------------------------------------------------

def test_generate_deterministic_blocks():
    """Same seed → same pattern and id."""
    rng1 = SeededRNG("12345")
    rng2 = SeededRNG("12345")

    b1 = generate_random_block(rng1)
    b2 = generate_random_block(rng2)

    assert b1.pattern == b2.pattern
    assert b1.id == b2.id


def test_generate_valid_blocks():
    """Blocks must have correct shape and valid colors (1 or 2)."""
    rng = SeededRNG("12345")

    for _ in range(50):
        block = generate_random_block(rng)
        assert len(block.pattern) == 2
        assert len(block.pattern[0]) == 2
        assert len(block.id) == 8

        for y in range(2):
            for x in range(2):
                assert block.pattern[y][x] in (1, 2)
