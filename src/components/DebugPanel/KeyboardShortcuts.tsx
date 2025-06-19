import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type { ControlsConfig } from '@/types/game';

interface KeyboardShortcutsProps {
  controlsConfig?: ControlsConfig;
}

export function KeyboardShortcuts({
  controlsConfig = DEFAULT_CONTROLS,
}: KeyboardShortcutsProps) {
  // Helper function to format key names for display
  const formatKey = (key: string) => {
    return key
      .replace('Key', '')
      .replace('Arrow', '')
      .replace('Escape', 'Esc')
      .replace('Space', 'Space');
  };

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
    <div className="rounded-md bg-gray-800/80 p-2 text-xs text-gray-400">
      <div className="mb-1 font-medium text-gray-300">Keyboard Shortcuts:</div>
      <div className="space-y-1">
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
