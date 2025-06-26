import type { Meta, StoryObj } from '@storybook/react-vite';
import { useReducer, useCallback } from 'react';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';

import { useControls, type UseControlsOptions } from './useControls';

// Demo component to showcase the hook
function ControlsDemo({ options }: { options?: UseControlsOptions }) {
  const [gameState, dispatch] = useReducer(
    gameReducer,
    createInitialGameState('12345', options?.debugMode)
  );

  // Create mock actions that dispatch to the reducer
  const actions = {
    moveLeft: useCallback(() => dispatch({ type: 'MOVE_LEFT' }), []),
    moveRight: useCallback(() => dispatch({ type: 'MOVE_RIGHT' }), []),
    rotateCW: useCallback(() => dispatch({ type: 'ROTATE_CW' }), []),
    rotateCCW: useCallback(() => dispatch({ type: 'ROTATE_CCW' }), []),
    softDrop: useCallback(() => dispatch({ type: 'SOFT_DROP' }), []),
    hardDrop: useCallback(() => dispatch({ type: 'HARD_DROP' }), []),
    pause: useCallback(() => dispatch({ type: 'PAUSE' }), []),
    resume: useCallback(() => dispatch({ type: 'RESUME' }), []),
    tick: useCallback(() => dispatch({ type: 'TICK' }), []),
    startNewGame: useCallback(() => dispatch({ type: 'START_GAME' }), []),
    restartGame: useCallback(() => dispatch({ type: 'RESTART' }), []),
    setDebugMode: useCallback(
      (enabled: boolean) =>
        dispatch({ type: 'SET_DEBUG_MODE', payload: enabled }),
      []
    ),
  };

  const controlsReturn = useControls(gameState, actions, options);

  return (
    <div className="min-h-screen space-y-6 bg-gray-900 p-6 text-white">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">useControls Hook Demo</h2>

        {/* Game State Display */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Game State</h3>
            <div className="space-y-1 rounded bg-gray-800 p-3 font-mono text-sm">
              <div>
                Status:{' '}
                <span className="text-blue-400">{gameState.status}</span>
              </div>
              <div>
                Frame: <span className="text-green-400">{gameState.frame}</span>
              </div>
              <div>
                Score:{' '}
                <span className="text-yellow-400">{gameState.score}</span>
              </div>
              <div>
                Debug Mode:{' '}
                <span className="text-purple-400">
                  {gameState.debugMode ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Controls State</h3>
            <div className="space-y-1 rounded bg-gray-800 p-3 font-mono text-sm">
              <div>
                Pressed Keys:{' '}
                <span className="text-yellow-400">
                  {controlsReturn.pressedKeys.size}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Currently Pressed Keys */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Currently Pressed Keys</h3>
          <div className="min-h-[40px] rounded bg-gray-800 p-3">
            {controlsReturn.pressedKeys.size === 0 ? (
              <span className="text-sm text-gray-500">No keys pressed</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(controlsReturn.pressedKeys).map(key => (
                  <span
                    key={key}
                    className="block rounded bg-blue-600 px-2 py-1 text-xs"
                  >
                    {key}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Control Mappings */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Control Mappings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(options?.controlsConfig || DEFAULT_CONTROLS).map(
              ([action, keys]) => (
                <div key={action} className="rounded bg-gray-800 p-3">
                  <div className="font-semibold text-blue-400 capitalize">
                    {action.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-gray-300">
                    {keys.map((key: string, index: number) => (
                      <span key={key}>
                        <code className="rounded bg-gray-700 px-1">{key}</code>
                        {index < keys.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Instructions</h3>
          <div className="space-y-2 rounded bg-gray-800 p-4 text-sm">
            <p>🎮 Try the controls and watch the state update in real-time!</p>
            <p>
              🔧 Switch between different configurations to see behavior changes
            </p>
            <p>
              ⌨️ All keyboard events are captured and processed
              deterministically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ControlsDemo> = {
  title: 'Hooks/useControls',
  component: ControlsDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# useControls Hook

The \`useControls\` hook provides comprehensive keyboard input handling for the Lumines game with built-in replay recording capabilities.

## Key Features

### 🎯 **Deterministic Input System**
All inputs are recorded with exact frame timestamps to ensure replay accuracy and deterministic behavior across different environments.

### 🎮 **Complete Control Mapping**
- **Movement**: Arrow Keys / WASD
- **Rotation**: Z/X keys (CCW/CW) or Q/Up Arrow  
- **Drop**: Space (hard drop) / Down Arrow (soft drop)
- **Game**: P/Escape (pause), R (restart)
- **Debug**: F1/G (debug mode), Period/] (step frame)

### 📼 **Replay Recording**
Built-in input recording with frame-perfect timing for deterministic replay functionality.

### ⚡ **Performance Optimized**
Hybrid useRef + useState approach for zero-lag input handling with batched UI updates.

### 🔧 **Key Repeat Support**
Optional key repeat functionality with configurable timing (default: 150ms).

### 🎭 **State-Aware Behavior**
Different input handling based on game state (start/playing/paused/gameOver/debug).

## Architecture Decisions

### Frame-Based Timing
Uses game frame counter instead of \`Date.now()\` to maintain deterministic timing across different execution environments.

### Command Pattern
Each input maps to a specific GameAction that gets dispatched through the reducer for consistent state management.

### Performance Optimization
Uses hybrid useRef + useState to avoid re-renders on every input while maintaining UI responsiveness.

### Memory Management
Proper cleanup of event listeners and timers to prevent memory leaks.

## Usage Examples

\`\`\`typescript
// Basic usage
const controls = useControls(gameState, dispatch);

// With key repeat for rapid movement
const controls = useControls(gameState, dispatch, {
  enableKeyRepeat: true,
  keyRepeatDelay: 100 // Fast repeat
});

// Debug mode with custom controls
const controls = useControls(gameState, dispatch, {
  debugMode: true,
  controlsConfig: customControls
});
\`\`\`

## keyRepeatDelay Explanation

Controls the timing behavior for key repeat when \`enableKeyRepeat\` is true:

- **Initial Delay**: How long to wait before starting to repeat (150ms default)
- **Repeat Interval**: How frequently the action repeats while held (150ms default)

\`\`\`
t=0ms:   Key pressed → Action fires immediately
t=150ms: First repeat → Action fires again  
t=300ms: Second repeat → Action fires again
... continues every 150ms until key released
\`\`\`

## Return Values

- **isRecording**: Whether input recording is active
- **recordedInputs**: Array of recorded inputs (UI-optimized, may be batched)
- **recordedInputsCount**: Real-time count of all recorded inputs
- **refreshRecordedInputs**: Force refresh UI with latest recorded inputs
- **startRecording/stopRecording/clearRecording**: Recording control functions
- **pressedKeys**: Set of currently pressed keys for UI feedback
        `,
      },
    },
  },
  argTypes: {
    options: {
      description: 'Configuration options for the useControls hook',
      control: { type: 'object' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    options: {},
  },
};

// With key repeat enabled
export const WithKeyRepeat: Story = {
  args: {
    options: {
      enableKeyRepeat: true,
      keyRepeatDelay: 100,
    },
  },
};

// Debug mode
export const DebugMode: Story = {
  args: {
    options: {
      debugMode: true,
    },
  },
};

// Custom controls
export const CustomControls: Story = {
  args: {
    options: {
      controlsConfig: {
        ...DEFAULT_CONTROLS,
        moveLeft: ['KeyA', 'KeyH'],
        moveRight: ['KeyD', 'KeyL'],
        rotateCW: ['KeyW', 'KeyK'],
        rotateCCW: ['KeyS', 'KeyJ'],
      },
    },
  },
};

// Fast key repeat for rapid movement
export const FastKeyRepeat: Story = {
  args: {
    options: {
      enableKeyRepeat: true,
      keyRepeatDelay: 50, // Very fast repeat
    },
  },
};

// Basic controls demonstration
export const BasicControlsOnly: Story = {
  args: {
    options: {},
  },
};
