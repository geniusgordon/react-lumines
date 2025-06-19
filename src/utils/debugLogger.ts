import type { GameState } from '@/types/game';

/**
 * Logs comprehensive game state information to the console with visual representations
 * @param gameState - The current game state to analyze and log
 */
export function logGameState(gameState: GameState): void {
  const timestamp = new Date().toLocaleTimeString();

  console.group(`🎮 [${timestamp}] Debug Panel State Snapshot`);

  // Block state
  console.group('🧱 Current Block State');
  console.log(
    '📍 Position:',
    `(${gameState.blockPosition.x}, ${gameState.blockPosition.y})`
  );
  console.log('🔄 Rotation:', gameState.currentBlock.rotation);
  console.log('🆔 Block ID:', gameState.currentBlock.id);

  // Visual pattern representation
  console.log('\n🎯 Current Block Pattern:');
  const currentPattern = gameState.currentBlock.pattern;
  const patternDisplay = currentPattern
    .map(
      row =>
        '    ' + row.map(cell => (cell === 0 ? '·' : cell.toString())).join(' ')
    )
    .join('\n');
  console.log(patternDisplay);
  console.groupEnd();

  // Board visualization
  console.group('🗂️ Current Board State');

  // Board statistics
  const filledCells = gameState.board.flat().filter(cell => cell !== 0).length;
  const totalCells = gameState.board.length * gameState.board[0].length;
  const fillPercentage = ((filledCells / totalCells) * 100).toFixed(1);

  console.log('📊 Board Stats:');
  console.log(
    `   📏 Dimensions: ${gameState.board[0].length}×${gameState.board.length}`
  );
  console.log(`   📈 Fill: ${filledCells}/${totalCells} (${fillPercentage}%)`);

  // Create visual board representation
  console.log('\n🎯 Visual Board (with current block):');
  console.log('Legend: ·=Empty, 1=Light, 2=Dark, [X]=Current Block\n');

  // Create a string-based visual representation
  const { x: blockX, y: blockY } = gameState.blockPosition;
  const pattern = gameState.currentBlock.pattern;

  // Track current block positions
  const currentBlockPositions = new Set<string>();
  for (let py = 0; py < pattern.length; py++) {
    for (let px = 0; px < pattern[py].length; px++) {
      const boardY = blockY + py;
      const boardX = blockX + px;
      if (
        pattern[py][px] !== 0 &&
        boardY >= 0 &&
        boardY < gameState.board.length &&
        boardX >= 0 &&
        boardX < gameState.board[0].length
      ) {
        currentBlockPositions.add(`${boardY},${boardX}`);
      }
    }
  }

  // Display the board with proper formatting
  const boardString = gameState.board
    .map((row, rowIndex) => {
      const rowString = row
        .map((cell, colIndex) => {
          const isCurrentBlock = currentBlockPositions.has(
            `${rowIndex},${colIndex}`
          );
          if (isCurrentBlock) {
            const patternY = rowIndex - blockY;
            const patternX = colIndex - blockX;
            const patternValue = pattern[patternY][patternX];
            return `[${patternValue}]`; // Current block
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

  // Enhanced Queue preview
  console.group('🔮 Block Queue Preview');
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
  console.group('🎲 Deterministic State');
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

  console.log(
    '💡 Tip: Enable debug mode in game settings for action-by-action logging'
  );
  console.groupEnd();
}
