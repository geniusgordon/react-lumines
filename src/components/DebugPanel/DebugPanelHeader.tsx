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
    <div className="flex items-center justify-between border-b border-gray-700/50 p-3">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-200">Debug Panel</h3>
      </div>
      <button
        onClick={onToggleExpanded}
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-gray-200"
        title={isExpanded ? 'Collapse panel' : 'Expand panel'}
      >
        <ChevronDown
          className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
