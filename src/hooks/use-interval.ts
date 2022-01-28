import React from 'react';

type CallbackFn = (time: number) => void;

function useInterval(callback: CallbackFn, interval: number) {
  const callbackRef = React.useRef<CallbackFn>(callback);
  const requestRef = React.useRef<ReturnType<typeof window.setTimeout>>();
  const intervalRef = React.useRef<number>(interval);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  React.useEffect(() => {
    function tick() {
      callbackRef.current(intervalRef.current);
    }

    if (interval) {
      requestRef.current = setInterval(tick, interval);
    }

    return () => {
      if (requestRef.current) {
        clearInterval(requestRef.current);
      }
    };
  }, [interval]);
}

export default useInterval;
