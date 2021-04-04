import React from 'react';

type CallbackFn = (keyCode: number) => void;

function useKeyDown(callback: CallbackFn) {
  const callbackRef = React.useRef<CallbackFn>(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cb = React.useCallback(e => {
    callbackRef.current(e.keyCode);
  }, []);

  React.useEffect(() => {
    window.addEventListener('keydown', cb);
    return () => window.removeEventListener('keydown', cb);
  }, [cb]);
}

export default useKeyDown;
