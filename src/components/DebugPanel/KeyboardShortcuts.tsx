interface KeyboardShortcutsProps {
  isVisible: boolean;
}

export function KeyboardShortcuts({ isVisible }: KeyboardShortcutsProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mt-2 rounded-md bg-gray-800/80 p-2 text-xs text-gray-400">
      <div className="mb-1 font-medium text-gray-300">Keyboard Shortcuts:</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Step Frame:</span>
          <kbd className="rounded bg-gray-700 px-1 text-gray-300">S</kbd>
        </div>
        <div className="flex justify-between">
          <span>Toggle Debug:</span>
          <kbd className="rounded bg-gray-700 px-1 text-gray-300">D</kbd>
        </div>
      </div>
    </div>
  );
}
