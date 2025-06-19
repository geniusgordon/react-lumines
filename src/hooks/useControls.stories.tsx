import type { Meta, StoryObj } from '@storybook/react-vite';
import { useReducer } from 'react';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';

import { useControls, type UseControlsOptions } from './useControls';

// Demo component to showcase the hook
function ControlsDemo({ options }: { options?: UseControlsOptions }) {
  const [gameState, dispatch] = useReducer(
    gameReducer,
    createInitialGameState(12345, options?.debugMode)
  );

  const controlsReturn = useControls(gameState, dispatch, options);

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
                Recording:{' '}
                <span className="text-blue-400">
                  {controlsReturn.isRecording ? 'ON' : 'OFF'}
                </span>
              </div>
              <div>
                Recorded Count:{' '}
                <span className="text-green-400">
                  {controlsReturn.recordedInputsCount}
                </span>
                <span className="ml-2 text-gray-500">
                  (UI: {controlsReturn.recordedInputs.length})
                </span>
              </div>
              <div>
                Pressed Keys:{' '}
                <span className="text-yellow-400">
                  {controlsReturn.pressedKeys.size}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Batch Size: {options?.uiUpdateBatchSize || 5}
              </div>
            </div>
          </div>
        </div>

        {/* Control Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recording Controls</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={controlsReturn.startRecording}
              disabled={controlsReturn.isRecording}
              className="rounded bg-green-600 px-4 py-2 text-sm disabled:bg-gray-600"
            >
              Start Recording
            </button>
            <button
              onClick={controlsReturn.stopRecording}
              disabled={!controlsReturn.isRecording}
              className="rounded bg-red-600 px-4 py-2 text-sm disabled:bg-gray-600"
            >
              Stop Recording
            </button>
            <button
              onClick={controlsReturn.clearRecording}
              className="rounded bg-orange-600 px-4 py-2 text-sm"
            >
              Clear ({controlsReturn.recordedInputsCount})
            </button>
            <button
              onClick={controlsReturn.refreshRecordedInputs}
              className="rounded bg-blue-600 px-4 py-2 text-sm"
              title="Force refresh UI to show latest recorded inputs"
            >
              Refresh UI
            </button>
          </div>
          <div className="text-xs text-gray-400">
            💡 The count updates immediately, but the input list updates in
            batches for performance
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

        {/* Recorded Inputs */}
        {controlsReturn.recordedInputs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Recorded Inputs (Last 10)</h3>
            <div className="max-h-64 overflow-y-auto rounded bg-gray-800 p-3">
              <div className="space-y-1 font-mono text-xs">
                {controlsReturn.recordedInputs
                  .slice(-10)
                  .map((input, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-blue-400">Frame {input.frame}</span>
                      <span className="text-green-400">{input.type}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Instructions</h3>
          <div className="space-y-2 rounded bg-gray-800 p-4 text-sm">
            <p>🎮 Try the controls and watch the state update in real-time!</p>
            <p>📼 Start recording to capture inputs for replay functionality</p>
            <p>
              ⚡ Notice how the count updates immediately but UI batches for
              performance
            </p>
            <p>
              🔧 Switch between different configurations to see behavior changes
            </p>
            <p>🔄 Use "Refresh UI" to force-update the input list display</p>
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

// With recording enabled
const controls = useControls(gameState, dispatch, {
  recording: true
});

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

// Performance optimized for rapid input
const controls = useControls(gameState, dispatch, {
  recording: true,
  uiUpdateBatchSize: 10, // Update UI every 10 inputs
  enableKeyRepeat: true
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

// With recording enabled
export const WithRecording: Story = {
  args: {
    options: {
      recording: true,
    },
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
      recording: true,
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
      recording: true,
      uiUpdateBatchSize: 10, // Less frequent UI updates for performance
    },
  },
};

// Performance demonstration - immediate UI updates
export const ImmediateUpdates: Story = {
  args: {
    options: {
      recording: true,
      uiUpdateBatchSize: 1, // Update UI on every input
    },
  },
};

// Performance demonstration - batched updates
export const BatchedUpdates: Story = {
  args: {
    options: {
      recording: true,
      uiUpdateBatchSize: 20, // Update UI every 20 inputs
    },
  },
};
