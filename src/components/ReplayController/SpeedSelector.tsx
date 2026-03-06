import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { getZIndexStyle, UI_Z_INDEX } from '@/constants/zIndex';
import { cn } from '@/lib/utils';

export interface SpeedSelectorProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export function SpeedSelector({ speed, onSpeedChange }: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentSpeedLabel =
    SPEED_OPTIONS.find(option => option.value === speed)?.label || `${speed}x`;

  const handleSpeedSelect = (newSpeed: number) => {
    onSpeedChange(newSpeed);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Speed Selector Button */}
      <Button onClick={() => setIsOpen(!isOpen)} size="sm" variant="secondary">
        <ChevronDown
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
        <span className="tabular-nums">{currentSpeedLabel}</span>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="bg-muted ring-border absolute bottom-full left-0 mb-2 w-24 rounded-md py-1 shadow-lg ring-1"
          style={{ ...getZIndexStyle(UI_Z_INDEX.DROPDOWN) }}
        >
          {SPEED_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSpeedSelect(option.value)}
              className={`hover:bg-accent block w-full px-3 py-2 text-left text-sm transition-colors ${
                speed === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground'
              }`}
            >
              <span className="tabular-nums">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
