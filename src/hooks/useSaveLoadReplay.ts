import { useCallback, useState } from 'react';
import { v7 } from 'uuid';

import type { ReplayData, SavedReplay } from '@/types/replay';

export interface SaveLoadError {
  message: string;
  code: 'STORAGE_ERROR' | 'VALIDATION_ERROR' | 'PARSE_ERROR';
}

export interface SaveLoadResult {
  success: boolean;
  error?: SaveLoadError;
}

const STORAGE_PREFIX = '@lumines/replay/';

export function useSaveLoadReplay() {
  const [savedReplays, setSavedReplays] = useState<SavedReplay[]>(() => {
    const replays: SavedReplay[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const replay = JSON.parse(stored) as SavedReplay;
            replays.push(replay);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    return replays.sort((a, b) => b.savedAt - a.savedAt);
  });

  const saveReplay = useCallback(
    (replayData: ReplayData, name: string): SaveLoadResult => {
      try {
        // Validate replay data
        if (!replayData.seed || !replayData.inputs || !replayData.gameConfig) {
          return {
            success: false,
            error: {
              message: 'Invalid replay data: missing required fields',
              code: 'VALIDATION_ERROR',
            },
          };
        }

        // Create new saved replay
        const savedReplay: SavedReplay = {
          id: v7(),
          name: name.trim() || `Replay ${new Date().toLocaleString()}`,
          data: replayData,
          savedAt: Date.now(),
        };

        // Save to localStorage with the specific key format
        const storageKey = `${STORAGE_PREFIX}${savedReplay.id}`;
        localStorage.setItem(storageKey, JSON.stringify(savedReplay));

        // Update state
        const updatedReplays = [...savedReplays, savedReplay].sort(
          (a, b) => b.savedAt - a.savedAt
        );
        setSavedReplays(updatedReplays);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            message: `Failed to save replay: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'STORAGE_ERROR',
          },
        };
      }
    },
    [savedReplays]
  );

  const loadReplay = useCallback(
    (replayId: string): ReplayData | null => {
      const replay = savedReplays.find(r => r.id === replayId);
      return replay ? replay.data : null;
    },
    [savedReplays]
  );

  const deleteReplay = useCallback(
    (replayId: string): SaveLoadResult => {
      try {
        const storageKey = `${STORAGE_PREFIX}${replayId}`;
        localStorage.removeItem(storageKey);

        const updatedReplays = savedReplays.filter(r => r.id !== replayId);
        setSavedReplays(updatedReplays);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            message: `Failed to delete replay: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'STORAGE_ERROR',
          },
        };
      }
    },
    [savedReplays]
  );

  const exportReplayToFile = useCallback(
    (replayId: string): SaveLoadResult => {
      try {
        const replay = savedReplays.find(r => r.id === replayId);
        if (!replay) {
          return {
            success: false,
            error: {
              message: 'Replay not found',
              code: 'VALIDATION_ERROR',
            },
          };
        }

        const blob = new Blob([JSON.stringify(replay.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${replay.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            message: `Failed to export replay: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'STORAGE_ERROR',
          },
        };
      }
    },
    [savedReplays]
  );

  const importReplayFromFile = useCallback(
    (file: File): Promise<SaveLoadResult> => {
      return new Promise(resolve => {
        const reader = new FileReader();

        reader.onload = e => {
          try {
            const jsonString = e.target?.result as string;
            const replayData = JSON.parse(jsonString) as ReplayData;

            // Validate imported data
            if (
              !replayData.seed ||
              !replayData.inputs ||
              !replayData.gameConfig
            ) {
              resolve({
                success: false,
                error: {
                  message: 'Invalid replay file: missing required fields',
                  code: 'VALIDATION_ERROR',
                },
              });
              return;
            }

            // Save the imported replay
            const result = saveReplay(
              replayData,
              file.name.replace('.json', '')
            );
            resolve(result);
          } catch (error) {
            resolve({
              success: false,
              error: {
                message: `Failed to parse replay file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                code: 'PARSE_ERROR',
              },
            });
          }
        };

        reader.onerror = () => {
          resolve({
            success: false,
            error: {
              message: 'Failed to read file',
              code: 'STORAGE_ERROR',
            },
          });
        };

        reader.readAsText(file);
      });
    },
    [saveReplay]
  );

  const clearAllReplays = useCallback((): SaveLoadResult => {
    try {
      // Remove all replay keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      setSavedReplays([]);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: `Failed to clear replays: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'STORAGE_ERROR',
        },
      };
    }
  }, []);

  return {
    savedReplays,
    saveReplay,
    loadReplay,
    deleteReplay,
    exportReplayToFile,
    importReplayFromFile,
    clearAllReplays,
  };
}
