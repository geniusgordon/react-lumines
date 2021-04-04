import React from 'react';
import { Dimension, Palette } from '../../constants';

export type CountdownProps = {
  time: number;
};

const Countdown: React.FC<CountdownProps> = ({ time }) => {
  return (
    <g>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={Palette.COUNTDOWN_BACKGROUND}
      />
      <text
        fill={Palette.INFO}
        fontSize={Dimension.SQUARE_SIZE * 2}
        x="50%"
        y="50%"
        alignmentBaseline="middle"
        textAnchor="middle"
      >
        {time}
      </text>
    </g>
  );
};

export default Countdown;
