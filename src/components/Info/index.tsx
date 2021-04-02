import React from 'react';
import Group from '../Group';
import { Dimension, Palette } from '../../constants';

export type ItemProps = {
  label: string;
  value: number;
};

export type InfoProps = {
  time: number;
  score: number;
};

const Item: React.FC<ItemProps> = ({ label, value }) => {
  return (
    <g>
      <text fill={Palette.LABEL} fontSize={Dimension.SQUARE_SIZE / 2}>
        {label}
      </text>
      <text
        fill={Palette.INFO}
        y={Dimension.SQUARE_SIZE}
        fontSize={Dimension.SQUARE_SIZE}
        fontFamily="monospace"
      >
        {value}
      </text>
    </g>
  );
};

const Info: React.FC<InfoProps> = ({ time, score }) => {
  return (
    <g>
      <Item label="Time" value={time} />
      <Group x={0} y={Dimension.SQUARE_SIZE * 2}>
        <Item label="Score" value={score} />
      </Group>
    </g>
  );
};

export default Info;
