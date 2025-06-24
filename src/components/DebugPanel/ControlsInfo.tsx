import type { UseControlsReturn } from '@/hooks';

export interface ControlsInfoProps {
  controls: UseControlsReturn;
}

export function ControlsInfo({ controls }: ControlsInfoProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-blue-400">Controls</h3>

      <div className="space-y-2">
        {/* Currently Pressed Keys */}
        <div className="space-y-1">
          <div className="text-xs text-gray-400">
            Pressed Keys ({controls.pressedKeys.size}):
          </div>
          <div className="h-[32px] rounded bg-gray-800/50 p-2">
            <div className="flex h-full flex-wrap items-center gap-1">
              {controls.pressedKeys.size === 0 ? (
                <span className="text-xs text-gray-500">None</span>
              ) : (
                Array.from(controls.pressedKeys).map(key => (
                  <span
                    key={key}
                    className="rounded bg-blue-600/80 px-1 py-0.5 text-xs text-white"
                  >
                    {key.replace('Key', '').replace('Arrow', '')}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
