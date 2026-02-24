"""
physics.py — Falling cell physics.
Port of src/utils/gameLogic/physics.ts
"""

import uuid
from typing import List, Tuple
from .constants import BOARD_WIDTH, BOARD_HEIGHT, FALLING_CELL_INTERVAL
from .types import FallingCell, FallingColumn, Square


def _new_cell_id() -> str:
    """Generate a UUID for a falling cell."""
    return str(uuid.uuid4())


def find_falling_cells_in_column(
    board: List[List[int]],
    x: int,
) -> List[FallingCell]:
    """
    Find cells in column x that should start falling (cells above a gap).
    Mutates board in-place: clears the found cells from the board.
    Returns cells sorted bottom-to-top (highest y first).
    """
    cells: List[FallingCell] = []
    found_gap = False

    for y in range(BOARD_HEIGHT - 1, -1, -1):
        cell = board[y][x]

        if cell == 0:
            found_gap = True
        elif found_gap:
            cells.append(FallingCell(id=_new_cell_id(), y=y, color=cell))
            board[y][x] = 0

    return cells


def create_falling_columns(
    board: List[List[int]],
    falling_columns: List[FallingColumn],
) -> Tuple[List[FallingColumn], List[List[int]]]:
    """
    Identify columns with unsupported (floating) cells and create
    FallingColumn records for them.

    Returns (new_falling_columns, new_board) where cells-to-fall have
    been removed from new_board.
    """
    new_board = [row[:] for row in board]
    new_falling_columns: List[FallingColumn] = []

    for x in range(BOARD_WIDTH):
        falling_cells = find_falling_cells_in_column(new_board, x)
        existing_col = next((c for c in falling_columns if c.x == x), None)

        if falling_cells or existing_col:
            merged = (existing_col.cells if existing_col else []) + falling_cells
            # Sort bottom-to-top: highest y value first
            merged.sort(key=lambda c: c.y, reverse=True)
            new_falling_columns.append(FallingColumn(
                x=x,
                cells=merged,
                timer=existing_col.timer if existing_col else 0,
            ))

    return new_falling_columns, new_board


def update_falling_columns(
    board: List[List[int]],
    falling_columns: List[FallingColumn],
) -> Tuple[List[List[int]], List[FallingColumn]]:
    """
    Advance falling cells by one tick.
    Cells that have landed are written to the board.
    Returns (new_board, new_falling_columns).
    """
    new_board = [row[:] for row in board]
    new_falling_columns: List[FallingColumn] = []

    for column in falling_columns:
        new_timer = column.timer + 1
        is_timer_reached = new_timer >= FALLING_CELL_INTERVAL
        updated_cells: List[FallingCell] = []

        for cell in column.cells:
            next_y = cell.y + 1

            if next_y >= BOARD_HEIGHT or new_board[next_y][column.x] != 0:
                # Cell has landed — write to board
                new_board[cell.y][column.x] = cell.color
                continue

            updated_cells.append(FallingCell(
                id=cell.id,
                y=next_y if is_timer_reached else cell.y,
                color=cell.color,
            ))

        if updated_cells:
            new_falling_columns.append(FallingColumn(
                x=column.x,
                cells=updated_cells,
                timer=0 if is_timer_reached else new_timer,
            ))

    return new_board, new_falling_columns


def clear_marked_cells_and_apply_gravity(
    board: List[List[int]],
    marked_cells: List[Square],
    falling_columns: List[FallingColumn],
) -> Tuple[List[List[int]], List[FallingColumn]]:
    """
    Clear all marked cells from the board, then re-detect falling columns.
    Returns (new_board, new_falling_columns).
    """
    new_board = [row[:] for row in board]

    # Build set of positions to clear
    cells_to_clear = {(cell.x, cell.y) for cell in marked_cells}

    for y in range(BOARD_HEIGHT):
        for x in range(BOARD_WIDTH):
            if (x, y) in cells_to_clear:
                new_board[y][x] = 0

    return create_falling_columns(new_board, falling_columns)
