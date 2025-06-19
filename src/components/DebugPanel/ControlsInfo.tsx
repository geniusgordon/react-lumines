import type { UseControlsReturn } from '@/hooks';

export interface ControlsInfoProps {
  controls: UseControlsReturn;
}

export function ControlsInfo({ controls }: ControlsInfoProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-blue-400">
        Controls & Recording
      </h3>

      <div className="space-y-2">
        {/* Recording Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Recording:</span>
          <span
            className={controls.isRecording ? 'text-green-400' : 'text-red-400'}
          >
            {controls.isRecording ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* Recorded Inputs Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Recorded Inputs:</span>
          <span className="text-yellow-400">
            {controls.recordedInputsCount}
          </span>
        </div>

        {/* UI Sync Status */}
        {controls.isRecording && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">UI Synced:</span>
            <span
              className={
                controls.recordedInputs.length === controls.recordedInputsCount
                  ? 'text-green-400'
                  : 'text-orange-400'
              }
            >
              {controls.recordedInputs.length}/{controls.recordedInputsCount}
            </span>
          </div>
        )}

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

        {/* Recording Controls */}
        {controls.isRecording && (
          <div className="flex gap-1">
            <button
              onClick={controls.stopRecording}
              className="flex-1 rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600"
            >
              Stop
            </button>
            <button
              onClick={controls.clearRecording}
              className="flex-1 rounded bg-orange-600/80 px-2 py-1 text-xs text-white hover:bg-orange-600"
            >
              Clear
            </button>
            <button
              onClick={controls.refreshRecordedInputs}
              className="flex-1 rounded bg-blue-600/80 px-2 py-1 text-xs text-white hover:bg-blue-600"
              title="Refresh UI to show latest inputs"
            >
              Sync
            </button>
          </div>
        )}

        {!controls.isRecording && (
          <button
            onClick={controls.startRecording}
            className="w-full rounded bg-green-600/80 px-2 py-1 text-xs text-white hover:bg-green-600"
          >
            Start Recording
          </button>
        )}

        {/* Recent Inputs (last 3) */}
        {controls.recordedInputs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Recent Inputs:</div>
            <div className="space-y-1 rounded bg-gray-800/50 p-2 text-xs">
              {controls.recordedInputs.slice(-3).map((input, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-blue-400">F{input.frame}</span>
                  <span className="font-mono text-green-400">
                    {input.type.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
