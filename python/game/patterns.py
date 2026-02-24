"""
patterns.py — 2×2 pattern detection.
Port of src/utils/gameLogic/patterns.ts
"""

from typing import List
from .constants import BOARD_WIDTH, BOARD_HEIGHT
from .types import Square


def detect_patterns(board: List[List[int]]) -> List[Square]:
    """
    Scan the board for all 2×2 same-colored regions.
    Returns a list of Square objects (top-left corner + color).
    """
    patterns: List[Square] = []

    for y in range(BOARD_HEIGHT - 1):
        for x in range(BOARD_WIDTH - 1):
            top_left = board[y][x]

            if top_left <= 0:
                continue

            top_right = board[y][x + 1]
            bottom_left = board[y + 1][x]
            bottom_right = board[y + 1][x + 1]

            if (top_left == top_right == bottom_left == bottom_right and top_left > 0):
                patterns.append(Square(x=x, y=y, color=top_left))

    return patterns


def get_patterns_by_left_column(
    detected_patterns: List[Square],
    column: int,
) -> List[Square]:
    """Return patterns whose left edge is at the given column."""
    return [p for p in detected_patterns if p.x == column]


def mark_column_cells(
    column: int,
    detected_patterns: List[Square],
) -> List[Square]:
    """
    Mark cells in the given column for clearing by the timeline sweep.

    Marks:
    - Left column of patterns whose left edge == column
    - Right column of patterns whose left edge == column - 1
    """
    marked_cells: List[Square] = []
    marked_set: set = set()

    def mark_cell(x: int, y: int, color: int) -> None:
        key = (x, y)
        if key not in marked_set:
            marked_cells.append(Square(x=x, y=y, color=color))
            marked_set.add(key)

    # Mark left column of patterns starting at current column
    for pattern in get_patterns_by_left_column(detected_patterns, column):
        mark_cell(pattern.x, pattern.y, pattern.color)
        mark_cell(pattern.x, pattern.y + 1, pattern.color)

    # Mark right column of patterns starting at previous column
    if column > 0:
        for pattern in get_patterns_by_left_column(detected_patterns, column - 1):
            mark_cell(pattern.x + 1, pattern.y, pattern.color)
            mark_cell(pattern.x + 1, pattern.y + 1, pattern.color)

    return marked_cells
