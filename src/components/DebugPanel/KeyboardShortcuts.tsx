import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type { ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface KeyboardShortcutsProps {
  controlsConfig?: ControlsConfig;
}

export function KeyboardShortcuts({
  controlsConfig = DEFAULT_CONTROLS,
}: KeyboardShortcutsProps) {
  const renderKeys = (keys: string[]) => (
    <KbdGroup>
      {keys.map(key => (
        <Kbd key={key}>{formatKey(key)}</Kbd>
      ))}
    </KbdGroup>
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
    <div className="border-border bg-muted rounded-lg border p-4 backdrop-blur-sm">
      <h3 className="text-foreground mb-3 text-sm font-semibold tracking-wide">
        Controls
      </h3>
      <div className="space-y-2">
        {controls.map(({ label, keys }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {label}:
            </span>
            {renderKeys(keys)}
          </div>
        ))}
      </div>
    </div>
  );
}
