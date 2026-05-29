import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';

export interface ScreenHeaderProps {
  /** Center label, e.g. "Training" or a replay name. Ignored when `center` is set. */
  title?: ReactNode;
  /** Back-navigation handler for the left slot. */
  onBack: () => void;
  /** Label next to the back arrow. Defaults to "Menu". */
  backLabel?: string;
  /** Optional muted inline text rendered after the title (e.g. replay date • score). */
  meta?: ReactNode;
  /** Full override of the center slot (e.g. AI Watch's connect form). Replaces title/meta. */
  center?: ReactNode;
  /** Right-slot content: action buttons or status text. */
  actions?: ReactNode;
  /** Optional expandable content rendered below the bar (e.g. replay upload form). */
  children?: ReactNode;
}

/**
 * Shared slim top bar used by the in-game screens (Play / Training / Replay /
 * AI Watch). Three-column grid keeps the title centered regardless of the
 * left/right slot widths.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Menu',
  meta,
  center,
  actions,
  children,
}: ScreenHeaderProps) {
  return (
    <div
      className="absolute top-0 right-0 left-0"
      style={getZIndexStyle(UI_Z_INDEX.SYSTEM_OVERLAY)}
    >
      <div className="grid grid-cols-3 items-center px-4 py-3">
        <div className="justify-self-start">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft />
            {backLabel}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 justify-self-center text-center">
          {center ?? (
            <>
              {title && (
                <span className="text-foreground text-sm font-semibold">
                  {title}
                </span>
              )}
              {meta && (
                <span className="text-muted-foreground text-sm">{meta}</span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          {actions}
        </div>
      </div>

      {children}
    </div>
  );
}
