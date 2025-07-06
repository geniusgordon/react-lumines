import { useEffect, useCallback, useRef } from 'react';

import {
  isInputFieldActive,
  getModifierFlags,
  shouldPreventDefault,
} from '@/utils/keyboardUtils';

import type { ReplayControllerActions } from './useReplayPlayer';

interface ReplayKeyboardMapping {
  playPause: string[]; // Space
  restart: string[]; // R
  speedUp: string[]; // +, =
  speedDown: string[]; // -, _
  seekBackward: string[]; // Left arrow
  seekForward: string[]; // Right arrow
  stepBackward: string[]; // Shift + Left
  stepForward: string[]; // Shift + Right
  seek10Backward: string[]; // Ctrl + Left
  seek10Forward: string[]; // Ctrl + Right
  speedPresets: Record<string, number>; // 1-7 keys for speed presets
}

const DEFAULT_REPLAY_CONTROLS: ReplayKeyboardMapping = {
  playPause: ['Space'],
  restart: ['KeyR'],
  speedUp: ['Equal', 'NumpadAdd'],
  speedDown: ['Minus', 'NumpadSubtract'],
  seekBackward: ['ArrowLeft'],
  seekForward: ['ArrowRight'],
  stepBackward: ['ArrowLeft'], // With shift modifier
  stepForward: ['ArrowRight'], // With shift modifier
  seek10Backward: ['ArrowLeft'], // With ctrl modifier
  seek10Forward: ['ArrowRight'], // With ctrl modifier
  speedPresets: {
    Digit1: 0.25,
    Digit2: 0.5,
    Digit3: 0.75,
    Digit4: 1.0,
    Digit5: 1.25,
    Digit6: 1.5,
    Digit7: 2.0,
  },
};

export interface UseReplayControlsOptions {
  controllerActions: ReplayControllerActions;
  currentSpeed: number;
  enabled?: boolean;
}

export function useReplayControls({
  controllerActions,
  currentSpeed,
  enabled = true,
}: UseReplayControlsOptions) {
  const controlsRef = useRef(DEFAULT_REPLAY_CONTROLS);

  const getSpeedStep = useCallback(
    (increase: boolean) => {
      const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const currentIndex = speeds.findIndex(
        speed => Math.abs(speed - currentSpeed) < 0.01
      );

      if (currentIndex === -1) {
        return currentSpeed;
      }

      if (increase) {
        return currentIndex < speeds.length - 1
          ? speeds[currentIndex + 1]
          : speeds[speeds.length - 1];
      } else {
        return currentIndex > 0 ? speeds[currentIndex - 1] : speeds[0];
      }
    },
    [currentSpeed]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Skip if user is typing in an input field
      if (isInputFieldActive()) {
        return;
      }

      const key = event.code;
      const controls = controlsRef.current;

      // Check modifiers
      const modifiers = getModifierFlags(event);

      // Handle play/pause
      if (controls.playPause.includes(key)) {
        if (shouldPreventDefault(event, true, modifiers)) {
          event.preventDefault();
          event.stopPropagation();
        }
        controllerActions.togglePlayPause();
        return;
      }

      // Handle restart
      if (controls.restart.includes(key)) {
        if (shouldPreventDefault(event, true, modifiers)) {
          event.preventDefault();
          event.stopPropagation();
        }
        controllerActions.restart();
        return;
      }

      // Handle speed controls
      if (controls.speedUp.includes(key)) {
        if (shouldPreventDefault(event, true, modifiers)) {
          event.preventDefault();
          event.stopPropagation();
        }
        const newSpeed = getSpeedStep(true);
        controllerActions.setSpeed(newSpeed);
        return;
      }

      if (controls.speedDown.includes(key)) {
        if (shouldPreventDefault(event, true, modifiers)) {
          event.preventDefault();
          event.stopPropagation();
        }
        const newSpeed = getSpeedStep(false);
        controllerActions.setSpeed(newSpeed);
        return;
      }

      // Handle speed presets
      if (key in controls.speedPresets) {
        if (shouldPreventDefault(event, true, modifiers)) {
          event.preventDefault();
          event.stopPropagation();
        }
        const speed = controls.speedPresets[key];
        controllerActions.setSpeed(speed);
        return;
      }

      // Handle seeking with modifiers
      if (controls.seekBackward.includes(key)) {
        event.preventDefault();
        event.stopPropagation();

        if (modifiers.shift) {
          // Step backward 1 frame
          controllerActions.stepFrames(-1);
        } else if (modifiers.ctrl || modifiers.meta) {
          // Seek backward 10 seconds (600 frames)
          controllerActions.stepFrames(-600);
        } else {
          // Seek backward 1 second (60 frames)
          controllerActions.stepFrames(-60);
        }
        return;
      }

      if (controls.seekForward.includes(key)) {
        event.preventDefault();
        event.stopPropagation();

        if (modifiers.shift) {
          // Step forward 1 frame
          controllerActions.stepFrames(1);
        } else if (modifiers.ctrl || modifiers.meta) {
          // Seek forward 10 seconds (600 frames)
          controllerActions.stepFrames(600);
        } else {
          // Seek forward 1 second (60 frames)
          controllerActions.stepFrames(60);
        }
        return;
      }
    },
    [enabled, controllerActions, getSpeedStep]
  );

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown, enabled]);

  return {
    keyboardMapping: controlsRef.current,
  };
}
