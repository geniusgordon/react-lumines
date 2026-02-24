"""
rng.py — Seeded RNG for deterministic gameplay.
Port of src/utils/seededRNG/seededRNG.ts

Note: Uses Python's random.Random(seed). This produces a different sequence
than npm's random-seed from the same string seed, but is internally consistent:
the same Python seed always yields the same block sequence.
"""

import random


class SeededRNG:
    def __init__(self, seed: str = ""):
        self._seed = seed
        self._rng = random.Random(seed)
        self._call_count = 0

    def next(self) -> float:
        """Return next float in [0, 1)."""
        self._call_count += 1
        return self._rng.random()

    def next_int(self, max_val: int) -> int:
        """Return random int in [0, max_val)."""
        if max_val <= 0:
            raise ValueError("max_val must be positive")
        return int(self.next() * max_val)

    def choice(self, array: list):
        """Choose a random element from array."""
        if not array:
            raise ValueError("Cannot choose from empty array")
        return array[self.next_int(len(array))]

    def generate_id(self) -> str:
        """Generate deterministic 8-char hex string."""
        chars = "0123456789abcdef"
        return "".join(chars[self.next_int(16)] for _ in range(8))

    def get_state(self) -> int:
        """Return current call count (for serialization)."""
        return self._call_count

    def set_state(self, call_count: int) -> None:
        """Restore RNG to given call count position."""
        self._rng = random.Random(self._seed)
        self._call_count = 0
        for _ in range(call_count):
            self._rng.random()
            self._call_count += 1

    def reset(self, new_seed: str = None) -> None:
        seed = new_seed if new_seed is not None else self._seed
        self._seed = seed
        self._rng = random.Random(seed)
        self._call_count = 0

    def get_seed(self) -> str:
        return self._seed

    def clone(self) -> "SeededRNG":
        clone = SeededRNG(self._seed)
        clone.set_state(self._call_count)
        return clone
