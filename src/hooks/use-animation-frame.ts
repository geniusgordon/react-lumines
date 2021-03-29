import React from 'react';

type CallbackFn = (time: number) => void;

const useAnimationFrame = (callback: CallbackFn, enabled: Boolean) => {
  const callbackRef = React.useRef<CallbackFn>(callback);
  const requestRef = React.useRef<number>();
  const previousTimeRef = React.useRef<number>();

  React.useCallback(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    function tick(time: number) {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      if (enabled) {
        requestRef.current = requestAnimationFrame(tick);
      }
    }

    if (enabled) {
      requestRef.current = requestAnimationFrame(tick);
    }

    return () => {
      previousTimeRef.current = undefined;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [enabled]);
};

export default useAnimationFrame;
