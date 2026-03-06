import { Bug, ChevronDown } from 'lucide-react';

interface DebugPanelHeaderProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function DebugPanelHeader({
  isExpanded,
  onToggleExpanded,
}: DebugPanelHeaderProps) {
  return (
    <div className="border-border flex items-center justify-between border-b p-3">
      <div className="flex items-center gap-2">
        <Bug className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-semibold tracking-wide">
          Debug Panel
        </span>
        <span className="text-muted-foreground text-xs tracking-wider uppercase">
          dev
        </span>
      </div>
      <button
        onClick={onToggleExpanded}
        className="text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded p-1 transition-colors"
        title={isExpanded ? 'Collapse panel' : 'Expand panel'}
      >
        <ChevronDown
          className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
