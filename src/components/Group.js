import React from 'react';

const Group = ({ x = 0, y = 0, children }) => (
  <g transform={`translate(${x}, ${y})`}>
    {children}
  </g>
);

export default Group;
