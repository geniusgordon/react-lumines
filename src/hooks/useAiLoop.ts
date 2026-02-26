import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { BOARD_WIDTH, FRAME_INTERVAL_MS } from '@/constants/gameConfig';

const DEFAULT_WS_URL = 'ws://localhost:8765';

export interface UseAiLoopReturn {
  isConnected: boolean;
  isRunning: boolean;
  currentFPS: number;
  manualStep: (steps?: number) => void;
}

/** Serialize GameState into the Observation JSON the Python model expects. */
export function buildObservationFromState(state: GameState): object {
  return {
    board: state.board,
    currentBlock: state.currentBlock.pattern,
    blockPosition: { x: state.blockPosition.x, y: state.blockPosition.y },
    queue: state.queue.slice(0, 2).map(b => b.pattern),
    timelineX: state.timeline.x,
    score: state.score,
    frame: state.frame,
    gameTimer: state.gameTimer,
  };
}

export function useAiLoop(
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>,
  options?: { wsUrl?: string }
): UseAiLoopReturn {
  const wsUrl = options?.wsUrl ?? DEFAULT_WS_URL;

  const [isConnected, setIsConnected] = useState(false);
  const [currentFPS, setCurrentFPS] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const gameStateRef = useRef(gameState);
  const decidingRef = useRef(false);
  const pendingActionRef = useRef<{ targetX: number; rotation: number } | null>(null);
  const lastBlockIdRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);
  const fpsFrameCountRef = useRef(0);
  const fpsLastTimeRef = useRef(0);
  const isConnectedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  });

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const actionInt = parseInt(event.data, 10);
      if (!isNaN(actionInt)) {
        pendingActionRef.current = {
          targetX: Math.floor(actionInt / 4),
          rotation: actionInt % 4,
        };
      }
      decidingRef.current = false;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  // Game loop tick
  const tick = useCallback(() => {
    const now = performance.now();
    const state = gameStateRef.current;

    // FPS tracking
    fpsFrameCountRef.current++;
    if (now - fpsLastTimeRef.current >= 1000) {
      setCurrentFPS(fpsFrameCountRef.current);
      fpsFrameCountRef.current = 0;
      fpsLastTimeRef.current = now;
    }

    if (state.status === 'playing' && isConnectedRef.current) {
      // Pending AI action: apply it
      if (pendingActionRef.current && !decidingRef.current) {
        const { targetX, rotation } = pendingActionRef.current;
        pendingActionRef.current = null;

        for (let i = 0; i < rotation; i++) {
          dispatch({ type: 'ROTATE_CW' });
        }
        const currentX = state.blockPosition.x;
        const maxX = BOARD_WIDTH - 2;
        const clampedTarget = Math.max(0, Math.min(targetX, maxX));
        const clampedDx = clampedTarget - currentX;
        if (clampedDx < 0) {
          for (let i = 0; i < -clampedDx; i++) dispatch({ type: 'MOVE_LEFT' });
        } else if (clampedDx > 0) {
          for (let i = 0; i < clampedDx; i++) dispatch({ type: 'MOVE_RIGHT' });
        }
        dispatch({ type: 'HARD_DROP' });
        return;
      }

      // New block spawned: request AI decision
      const blockId = state.currentBlock.id;
      if (blockId !== lastBlockIdRef.current && !decidingRef.current) {
        lastBlockIdRef.current = blockId;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          decidingRef.current = true;
          const obs = buildObservationFromState(state);
          wsRef.current.send(JSON.stringify(obs));
        }
        // Don't tick this frame while waiting
        return;
      }

      // Normal tick (gravity, timeline, etc.)
      if (!decidingRef.current) {
        dispatch({ type: 'TICK' });
      }
    } else if (state.status === 'countdown') {
      dispatch({ type: 'TICK' });
    }
  }, [dispatch]);

  // RAF loop with fixed timestep
  useEffect(() => {
    if (gameState.status !== 'playing' && gameState.status !== 'countdown') return;

    let accumulated = 0;
    let lastTime = performance.now();

    function loop(now: number) {
      accumulated += now - lastTime;
      lastTime = now;

      while (accumulated >= FRAME_INTERVAL_MS) {
        tick();
        accumulated -= FRAME_INTERVAL_MS;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState.status, tick]);

  return {
    isConnected,
    isRunning: gameState.status === 'playing',
    currentFPS,
    manualStep: () => {},
  };
}
