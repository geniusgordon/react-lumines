import React from 'react';

export type GroupProps = {
  x?: number;
  y?: number;
  children: React.ReactNode;
};

const Group: React.FC<GroupProps> = ({ x = 0, y = 0, children }) => (
  <g transform={`translate(${x}, ${y})`}>{children}</g>
);

export default Group;
