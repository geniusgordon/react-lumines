import { useState, useCallback } from 'react';

import type { ReplayData } from '@/types/replay';

export interface UseReplayShareResult {
  isSharing: boolean;
  shareMessage: string | null;
  shareReplay: () => Promise<void>;
}

export function useReplayShare(
  replayData: ReplayData | null
): UseReplayShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const shareReplay = useCallback(async () => {
    if (!replayData) {
      return;
    }

    setIsSharing(true);
    setShareMessage(null);

    try {
      const replayUrl = `${window.location.origin}/replays/${replayData.id}`;

      await navigator.clipboard.writeText(replayUrl);
      setShareMessage('Replay URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to share replay:', error);
      setShareMessage('Failed to share replay. Please try again.');
    } finally {
      setIsSharing(false);
      // Clear message after 3 seconds
      setTimeout(() => setShareMessage(null), 3000);
    }
  }, [replayData]);

  return {
    isSharing,
    shareMessage,
    shareReplay,
  };
}
