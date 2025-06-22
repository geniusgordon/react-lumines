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
    <div className="ml-4 space-x-1">
      {keys.map(key => (
        <kbd key={key} className="rounded bg-gray-700 px-1 text-gray-300">
          {formatKey(key)}
        </kbd>
      ))}
    </div>
  );

  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">Controls</h3>
      <div className="space-y-1 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Move Left:</span>
          {renderKeys(controlsConfig.moveLeft)}
        </div>
        <div className="flex justify-between">
          <span>Move Right:</span>
          {renderKeys(controlsConfig.moveRight)}
        </div>
        <div className="flex justify-between">
          <span>Rotate CW:</span>
          {renderKeys(controlsConfig.rotateCW)}
        </div>
        <div className="flex justify-between">
          <span>Rotate CCW:</span>
          {renderKeys(controlsConfig.rotateCCW)}
        </div>
        <div className="flex justify-between">
          <span>Soft Drop:</span>
          {renderKeys(controlsConfig.softDrop)}
        </div>
        <div className="flex justify-between">
          <span>Hard Drop:</span>
          {renderKeys(controlsConfig.hardDrop)}
        </div>
        <div className="flex justify-between">
          <span>Pause:</span>
          {renderKeys(controlsConfig.pause)}
        </div>
        <div className="flex justify-between">
          <span>Restart:</span>
          {renderKeys(controlsConfig.restart)}
        </div>
        <div className="flex justify-between">
          <span>Toggle Debug:</span>
          {renderKeys(controlsConfig.debug)}
        </div>
      </div>
    </div>
  );
}
