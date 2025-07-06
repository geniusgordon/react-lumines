import { useEffect, useCallback, useRef } from 'react';

import { isInputFieldActive, getModifierFlags } from '@/utils/keyboardUtils';

export interface KeyboardListenerOptions {
  enabled?: boolean;
  capture?: boolean;
}

export interface KeyboardHandlerProps {
  key: string;
  event: KeyboardEvent;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    meta: boolean;
  };
}

export function useKeyboardListener(
  handler: (props: KeyboardHandlerProps) => void,
  options: KeyboardListenerOptions = {}
) {
  const { enabled = true, capture = false } = options;
  const handlerRef = useRef(handler);

  // Keep handler reference current
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || isInputFieldActive()) {
        return;
      }

      const key = event.code;
      const modifiers = getModifierFlags(event);

      handlerRef.current({
        key,
        event,
        modifiers,
      });
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventOptions = capture ? { capture: true } : undefined;
    document.addEventListener('keydown', handleKeyDown, eventOptions);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, eventOptions);
    };
  }, [handleKeyDown, enabled, capture]);

  return { handleKeyDown };
}
