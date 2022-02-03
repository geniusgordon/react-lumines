import React from 'react';
import useDisclosure from './use-disclosure';
import { serializeReplay } from '../game/serializer';
import { Replay } from '../game/types';

function useShareReplay(replay: Replay) {
  const shareSnackBar = useDisclosure();
  const handleShare = React.useCallback(() => {
    const sReplay = serializeReplay(replay);
    const dataStr = JSON.stringify([0, sReplay[1], 0, sReplay[3], sReplay[4]]);
    const { protocol, host } = window.location;
    const url = `${protocol}//${host}/replay?data=${encodeURIComponent(
      dataStr,
    )}`;
    navigator.clipboard.writeText(url);
    shareSnackBar.onOpen();
  }, [shareSnackBar, replay]);

  return { shareSnackBar, onShare: handleShare };
}

export default useShareReplay;
