import type {
  Block,
  GameAction,
  GameState,
  Position,
  Square,
} from '@/types/game';

/**
 * Debug logging helper
 */
export function logDebugAction(
  state: GameState,
  action: GameAction,
  newState?: GameState
) {
  if (!state.debugMode) {
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  const frameInfo = `Frame ${action.frame}`;

  console.groupCollapsed(`🐛 [${timestamp}] ${frameInfo} - ${action.type}`);

  // Log action details
  console.log('📥 Action:', action);

  // Log relevant state changes
  if (newState) {
    const stateChanges: Record<string, { from: any; to: any }> = {};

    // Track key state changes
    if (state.status !== newState.status) {
      stateChanges.status = { from: state.status, to: newState.status };
    }
    if (state.frame !== newState.frame) {
      stateChanges.frame = { from: state.frame, to: newState.frame };
    }
    if (state.score !== newState.score) {
      stateChanges.score = { from: state.score, to: newState.score };
    }
    if (
      state.blockPosition.x !== newState.blockPosition.x ||
      state.blockPosition.y !== newState.blockPosition.y
    ) {
      stateChanges.blockPosition = {
        from: { ...state.blockPosition },
        to: { ...newState.blockPosition },
      };
    }
    if (state.dropTimer !== newState.dropTimer) {
      stateChanges.dropTimer = {
        from: state.dropTimer,
        to: newState.dropTimer,
      };
    }
    if (state.detectedPatterns.length !== newState.detectedPatterns.length) {
      stateChanges.detectedPatterns = {
        from: state.detectedPatterns.length,
        to: newState.detectedPatterns.length,
      };
    }
    if (state.markedPatterns.length !== newState.markedPatterns.length) {
      stateChanges.markedPatterns = {
        from: state.markedPatterns.length,
        to: newState.markedPatterns.length,
      };
    }

    if (Object.keys(stateChanges).length > 0) {
      console.log('📊 State Changes:', stateChanges);
    } else {
      console.log('📊 State: No changes');
    }
  } else {
    console.log('📊 State: Before processing');
  }

  console.groupEnd();
}

export function logCurrentBlock(
  currentBlock: Block,
  blockPosition: Position
): void {
  // Block state
  console.groupCollapsed('🧱 Current Block State');
  console.log('📍 Position:', `(${blockPosition.x}, ${blockPosition.y})`);
  console.log('🔄 Rotation:', currentBlock.rotation);
  console.log('🆔 Block ID:', currentBlock.id);

  // Visual pattern representation
  console.log('\n🎯 Current Block Pattern:');
  const currentPattern = currentBlock.pattern;
  const patternDisplay = currentPattern
    .map(
      row =>
        '    ' + row.map(cell => (cell === 0 ? '·' : cell.toString())).join(' ')
    )
    .join('\n');
  console.log(patternDisplay);
  console.groupEnd();
}

export function logPatterns(
  detectedPatterns: Square[],
  markedPatterns: Square[]
): void {
  console.groupCollapsed('🔍 Pattern Detection');

  console.log('📊 Pattern Summary:');
  console.log(`   🔍 Detected: ${detectedPatterns.length} pattern(s)`);
  console.log(`   ✨ Marked: ${markedPatterns.length} pattern(s)`);

  if (detectedPatterns.length > 0) {
    console.log('\n🎯 Detected Patterns:');
    detectedPatterns.forEach((pattern, index) => {
      const colorName = pattern.color === 1 ? 'Light' : 'Dark';
      console.log(
        `   ${index + 1}. Position (${pattern.x}, ${pattern.y}) - ${colorName} (${pattern.color})`
      );
    });
  }

  if (markedPatterns.length > 0) {
    console.log('\n✨ Marked Patterns (ready for clearing):');
    markedPatterns.forEach((pattern, index) => {
      const colorName = pattern.color === 1 ? 'Light' : 'Dark';
      console.log(
        `   ${index + 1}. Position (${pattern.x}, ${pattern.y}) - ${colorName} (${pattern.color})`
      );
    });
  }

  if (detectedPatterns.length === 0 && markedPatterns.length === 0) {
    console.log('   No patterns detected or marked');
  }

  console.groupEnd();
}

export function logGameBoard(gameState: GameState, message: string): void {
  const {
    board,
    blockPosition,
    currentBlock,
    detectedPatterns,
    markedPatterns,
  } = gameState;

  // Board visualization
  console.groupCollapsed(`🗂️ Current Board State - ${message}`);

  // Board statistics
  const filledCells = board.flat().filter(cell => cell !== 0).length;
  const totalCells = board.length * board[0].length;
  const fillPercentage = ((filledCells / totalCells) * 100).toFixed(1);

  console.log('📊 Board Stats:');
  console.log(`   📏 Dimensions: ${board[0].length}×${board.length}`);
  console.log(`   📈 Fill: ${filledCells}/${totalCells} (${fillPercentage}%)`);

  // Create visual board representation
  console.log('\n🎯 Visual Board (with current block and patterns):');
  console.log(
    'Legend: ·=Empty, 1=Light, 2=Dark, [X]=Current Block, {X}=Detected, <X>=Marked\n'
  );

  // Create a string-based visual representation
  const { x: blockX, y: blockY } = blockPosition;
  const pattern = currentBlock.pattern;

  // Track current block positions
  const currentBlockPositions = new Set<string>();
  for (let py = 0; py < pattern.length; py++) {
    for (let px = 0; px < pattern[py].length; px++) {
      const boardY = blockY + py;
      const boardX = blockX + px;
      if (
        pattern[py][px] !== 0 &&
        boardY >= 0 &&
        boardY < board.length &&
        boardX >= 0 &&
        boardX < board[0].length
      ) {
        currentBlockPositions.add(`${boardY},${boardX}`);
      }
    }
  }

  // Track detected pattern positions (2x2 each)
  const detectedPositions = new Set<string>();
  detectedPatterns.forEach(square => {
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        detectedPositions.add(`${square.y + py},${square.x + px}`);
      }
    }
  });

  // Track marked pattern positions (2x2 each)
  const markedPositions = new Set<string>();
  markedPatterns.forEach(square => {
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        markedPositions.add(`${square.y + py},${square.x + px}`);
      }
    }
  });

  // Display the board with proper formatting
  const boardString = board
    .map((row, rowIndex) => {
      const rowString = row
        .map((cell, colIndex) => {
          const posKey = `${rowIndex},${colIndex}`;
          const isCurrentBlock = currentBlockPositions.has(posKey);
          const isDetected = detectedPositions.has(posKey);
          const isMarked = markedPositions.has(posKey);

          if (isCurrentBlock) {
            const patternY = rowIndex - blockY;
            const patternX = colIndex - blockX;
            const patternValue = pattern[patternY][patternX];
            return `[${patternValue}]`; // Current block
          }
          if (isMarked && cell !== 0) {
            return `<${cell}>`; // Marked pattern
          }
          if (isDetected && cell !== 0) {
            return `{${cell}}`; // Detected pattern
          }
          if (cell === 0) {
            return ' · ';
          } // Empty
          return ` ${cell} `; // Filled
        })
        .join('');

      // Add row numbers and special markers
      const rowNum = String(rowIndex).padStart(2, '0');
      return `${rowNum}│${rowString}│`;
    })
    .join('\n');

  console.log(boardString);
  console.groupEnd();
}

/**
 * Logs comprehensive game state information to the console with visual representations
 * @param gameState - The current game state to analyze and log
 */
export function logGameState(gameState: GameState): void {
  const timestamp = new Date().toLocaleTimeString();

  console.groupCollapsed(`🎮 [${timestamp}] Debug Panel State Snapshot`);

  logCurrentBlock(gameState.currentBlock, gameState.blockPosition);

  logGameBoard(gameState, 'Game State');

  logPatterns(gameState.detectedPatterns, gameState.markedPatterns);

  // Enhanced Queue preview
  console.groupCollapsed('🔮 Block Queue Preview');
  console.log('📦 Queue Length:', gameState.queue.length);
  console.log('📋 Next blocks in order:\n');

  gameState.queue.forEach((block, index) => {
    console.log(
      `📦 ${index + 1}. Block ID: ${block.id} (Rotation: ${block.rotation})`
    );

    // Visual pattern for each queued block
    const queuePatternDisplay = block.pattern
      .map(
        row =>
          '     ' +
          row.map(cell => (cell === 0 ? '·' : cell.toString())).join(' ')
      )
      .join('\n');
    console.log(queuePatternDisplay);

    // Add spacing between blocks except for the last one
    if (index < gameState.queue.length - 1) {
      console.log('');
    }
  });
  console.groupEnd();

  // RNG state for determinism debugging
  console.groupCollapsed('🎲 Deterministic State');
  console.log('🌱 Seed:', gameState.seed);
  console.log('🔄 RNG State:', gameState.rngState);
  console.log(
    '⏰ Last Update:',
    new Date(gameState.lastUpdateTime).toLocaleTimeString()
  );
  console.groupEnd();

  // Raw state (collapsed by default)
  console.groupCollapsed('📋 Raw State Data');
  console.log(gameState);
  console.groupEnd();

  console.groupEnd();
}
