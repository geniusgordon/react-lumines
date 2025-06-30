import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { getZIndexStyle, UI_Z_INDEX } from '@/constants/zIndex';

import { Button } from '../Button';

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
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="secondary"
        icon={ChevronDown}
        iconClassName={isOpen ? 'rotate-180' : ''}
      >
        <span className="font-mono">{currentSpeedLabel}</span>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-24 rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black/20"
          style={{ ...getZIndexStyle(UI_Z_INDEX.DROPDOWN) }}
        >
          {SPEED_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSpeedSelect(option.value)}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700 ${
                speed === option.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300'
              }`}
            >
              <span className="font-mono">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
