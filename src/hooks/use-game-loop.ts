import React from 'react';
import useAnimationFrame from './use-animation-frame';

type UpdateCallbackFn = (curTime: number, elapsed: number) => any;
type RenderCallbackFn = (curTime: number, elapsed: number) => any;

type args = {
  dt: number;
  onUpdate: UpdateCallbackFn;
  onRender: RenderCallbackFn;
  enabled: boolean;
};

function useGameLoop({ dt, onUpdate, onRender, enabled }: args) {
  const accRef = React.useRef<number>(0);
  const curTimeRef = React.useRef<number>(0);

  useAnimationFrame(elapsed => {
    accRef.current += elapsed;

    while (accRef.current >= dt) {
      curTimeRef.current += dt;
      onUpdate(curTimeRef.current, dt);
      accRef.current -= dt;
    }

    onRender(curTimeRef.current, accRef.current);
  }, enabled);
}

export default useGameLoop;
