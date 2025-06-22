import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type { ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface KeyboardShortcutsProps {
  controlsConfig?: ControlsConfig;
}

export function KeyboardShortcuts({
  controlsConfig = DEFAULT_CONTROLS,
}: KeyboardShortcutsProps) {
  // Helper function to render key badges
  const renderKeys = (keys: string[]) => (
    <div className="flex gap-1">
      {keys.map(key => (
        <kbd
          key={key}
          className="rounded-md border border-gray-600/50 bg-gray-700/80 px-2 py-1 font-mono text-xs text-gray-200 shadow-sm"
        >
          {formatKey(key)}
        </kbd>
      ))}
    </div>
  );

  const controls = [
    { label: 'Move Left', keys: controlsConfig.moveLeft },
    { label: 'Move Right', keys: controlsConfig.moveRight },
    { label: 'Rotate CW', keys: controlsConfig.rotateCW },
    { label: 'Rotate CCW', keys: controlsConfig.rotateCCW },
    { label: 'Soft Drop', keys: controlsConfig.softDrop },
    { label: 'Hard Drop', keys: controlsConfig.hardDrop },
    { label: 'Pause', keys: controlsConfig.pause },
    { label: 'Restart', keys: controlsConfig.restart },
    { label: 'Toggle Debug', keys: controlsConfig.debug },
  ];

  return (
    <div className="rounded-lg border border-gray-700/30 bg-gray-800/50 p-4 backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-300">
        Controls
      </h3>
      <div className="space-y-2">
        {controls.map(({ label, keys }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">{label}:</span>
            {renderKeys(keys)}
          </div>
        ))}
      </div>
    </div>
  );
}
