import { Settings, ChevronDown } from 'lucide-react';

interface DebugPanelHeaderProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function DebugPanelHeader({
  isExpanded,
  onToggleExpanded,
}: DebugPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border p-3">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Debug Panel</h3>
      </div>
      <button
        onClick={onToggleExpanded}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        title={isExpanded ? 'Collapse panel' : 'Expand panel'}
      >
        <ChevronDown
          className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
