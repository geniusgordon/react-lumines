import React from 'react';
import useDisclosure from './use-disclosure';
import { serializeReplay } from '../game/serializer';
import { Replay } from '../game/types';

function useShareReplay(replay: Replay) {
  const shareSnackBar = useDisclosure();
  const handleShare = React.useCallback(() => {
    const dataStr = JSON.stringify(serializeReplay(replay));
    const url = `${window.location.host}/replay?data=${dataStr}`;
    navigator.clipboard.writeText(url);
    shareSnackBar.onOpen();
  }, [shareSnackBar, replay]);

  return { shareSnackBar, onShare: handleShare };
}

export default useShareReplay;
