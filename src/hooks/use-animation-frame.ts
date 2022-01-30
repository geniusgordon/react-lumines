import React from 'react';

type CallbackFn = (time: number) => void;

function useAnimationFrame(callback: CallbackFn, enabled: boolean) {
  const callbackRef = React.useRef<CallbackFn>(callback);
  const requestRef = React.useRef<number>();
  const previousTimeRef = React.useRef<number>();
  const enabledRef = React.useRef<boolean>();

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  React.useEffect(() => {
    function tick(time: number) {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      if (enabledRef.current) {
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
}

export default useAnimationFrame;
