"""
test_board.py — Port of gameLogic.board.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.constants import BOARD_WIDTH, BOARD_HEIGHT
from python.game.board import create_empty_board, copy_board


def test_create_empty_board_dimensions():
    board = create_empty_board()
    assert len(board) == BOARD_HEIGHT
    assert len(board[0]) == BOARD_WIDTH


def test_create_empty_board_all_zeros():
    board = create_empty_board()
    for y in range(BOARD_HEIGHT):
        for x in range(BOARD_WIDTH):
            assert board[y][x] == 0


def test_copy_board_equals_original():
    board = create_empty_board()
    board[1][1] = 1
    board[2][2] = 2

    copy = copy_board(board)
    assert copy == board


def test_copy_board_is_deep_copy():
    board = create_empty_board()
    board[1][1] = 1

    copy = copy_board(board)
    copy[3][3] = 1

    assert board[3][3] == 0
