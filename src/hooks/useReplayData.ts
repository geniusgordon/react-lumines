import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOnlineReplay } from '@/hooks/useOnlineReplay';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';
import type { ExpandedReplayData, SavedReplay } from '@/types/replay';
import { expandReplayDataWithSnapshots } from '@/utils/replayUtils';

interface ReplayDataState {
  replay: SavedReplay | null;
  replayData: ExpandedReplayData | null;
  isOnlineReplay: boolean;
  loading: boolean;
  error: string | null;
}

export function useReplayData(id: string | undefined) {
  const navigate = useNavigate();
  const { savedReplays } = useSaveLoadReplay();

  const [state, setState] = useState<ReplayDataState>({
    replay: null,
    replayData: null,
    isOnlineReplay: false,
    loading: true,
    error: null,
  });

  // Only fetch online replay if ID is not found in local replays
  const shouldFetchOnline = id && !savedReplays.find(r => r.id === id);
  const {
    replay: onlineReplay,
    loading: onlineLoading,
    error: onlineError,
  } = useOnlineReplay(shouldFetchOnline ? id : null);

  useEffect(() => {
    if (!id) {
      navigate('/leaderboard');
      return;
    }

    // Try to find local replay first
    const foundReplay = savedReplays.find(r => r.id === id);

    if (foundReplay) {
      // Local replay found
      const expandedData = expandReplayDataWithSnapshots(foundReplay.data);
      setState({
        replay: foundReplay,
        replayData: expandedData,
        isOnlineReplay: false,
        loading: false,
        error: null,
      });
    } else if (onlineReplay) {
      // Online replay loaded
      const expandedData = expandReplayDataWithSnapshots(onlineReplay.data);
      setState({
        replay: onlineReplay,
        replayData: expandedData,
        isOnlineReplay: true,
        loading: false,
        error: null,
      });
    } else if (onlineError) {
      // Online replay failed to load
      setState(prev => ({
        ...prev,
        loading: false,
        error: onlineError,
      }));
      navigate('/leaderboard');
    } else if (shouldFetchOnline) {
      // Still loading online replay
      setState(prev => ({
        ...prev,
        loading: onlineLoading,
      }));
    } else {
      // No replay found locally and not fetching online
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Replay not found',
      }));
      navigate('/leaderboard');
    }
  }, [
    id,
    savedReplays,
    onlineReplay,
    onlineError,
    onlineLoading,
    navigate,
    shouldFetchOnline,
  ]);

  return state;
}
