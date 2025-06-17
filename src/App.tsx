import { GameBoard } from './components';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCK_PATTERNS,
} from './constants/gameConfig';
import type {
  GameBoard as GameBoardType,
  Block,
  Position,
  Timeline,
} from './types/game';

function App() {
  // Create a demo game board with some sample data
  const createDemoBoard = (): GameBoardType => {
    const board: GameBoardType = Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0));

    // Add some sample blocks to the bottom
    board[8][2] = 1;
    board[8][3] = 1;
    board[9][2] = 1;
    board[9][3] = 1;

    board[8][5] = 2;
    board[8][6] = 2;
    board[9][5] = 2;
    board[9][6] = 2;

    board[8][8] = 1;
    board[8][9] = 2;
    board[9][8] = 2;
    board[9][9] = 1;

    return board;
  };

  // Create a demo current block
  const demoBlock: Block = {
    pattern: BLOCK_PATTERNS[4] as [[1, 2], [2, 1]], // Diagonal pattern
    rotation: 0,
    id: 'demo-block',
  };

  const demoPosition: Position = { x: 7, y: 2 };

  const demoTimeline: Timeline = {
    x: 6.5,
    speed: 2,
    active: true,
    rectanglesCleared: 0,
  };

  const demoBoard = createDemoBoard();

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center">
      <div className="text-game-text mb-4 text-2xl font-bold">
        🎮 Lumines Game
      </div>
      <div>
        <GameBoard
          board={demoBoard}
          currentBlock={demoBlock}
          blockPosition={demoPosition}
          timeline={demoTimeline}
        />
      </div>
    </div>
  );
}

export default App;
