import type { UseControlsReturn } from '@/hooks';

export interface ControlsInfoProps {
  controls: UseControlsReturn;
}

export function ControlsInfo({ controls }: ControlsInfoProps) {
  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Live Keys
      </div>

      <div className="space-y-2">
        {/* Currently Pressed Keys */}
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Pressed Keys ({controls.pressedKeys.size}):
          </div>
          <div className="bg-muted/50 h-[32px] rounded p-2">
            <div className="flex h-full flex-wrap items-center gap-1">
              {controls.pressedKeys.size === 0 ? (
                <span className="text-muted-foreground text-xs">None</span>
              ) : (
                Array.from(controls.pressedKeys).map(key => (
                  <span
                    key={key}
                    className="bg-primary/80 text-primary-foreground rounded px-1 py-0.5 text-xs"
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
