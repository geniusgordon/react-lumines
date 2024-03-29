import React from 'react';
import { serializeReplay, deserializeReplay } from '../game/serializer';
import { Replay, ReplayManager, SerializedReplay } from '../game/types';

const KEY = '@lumines/replays';

type ReplayManagerContextValues = {
  data: ReplayManager;
  saveReplay: (replay: Replay) => void;
  deleteReplay: (id: string) => void;
};

export const ReplayManagerContext =
  React.createContext<ReplayManagerContextValues>({
    data: {},
    saveReplay() {},
    deleteReplay() {},
  });

function useReplayManager() {
  const [data, setData] = React.useState<ReplayManager>({});

  React.useEffect(() => {
    const dataStr = localStorage.getItem(KEY);
    if (dataStr) {
      try {
        const sReplays = JSON.parse(dataStr) as SerializedReplay[];
        const replays = sReplays.map(deserializeReplay);
        const byId: ReplayManager = {};
        replays.forEach(r => {
          byId[r.id] = r;
        });
        setData(byId);
      } catch (error) {
        console.log('parse error:', error);
      }
    }
  }, []);

  const updateLocalStorage = React.useCallback(() => {
    const replays = Object.values(data);
    const sReplays = replays.map(serializeReplay);
    localStorage.setItem(KEY, JSON.stringify(sReplays));
  }, [data]);

  const saveReplay = React.useCallback(
    (replay: Replay) => {
      setData(data => ({
        ...data,
        [replay.id]: replay,
      }));
      updateLocalStorage();
    },
    [updateLocalStorage],
  );

  const deleteReplay = React.useCallback(
    (itemId: string) => {
      setData(data => {
        const newData: ReplayManager = {};
        Object.keys(data).forEach(id => {
          if (id === itemId) {
            return;
          }
          newData[id] = data[id];
        });
        return newData;
      });
      updateLocalStorage();
    },
    [updateLocalStorage],
  );

  return { data, saveReplay, deleteReplay };
}

export default useReplayManager;
