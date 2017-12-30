import React, { Component } from 'react';
import Block from './Block';
import { dimensions } from '../constants';

const createColumn = (filter, BlockComponent) =>
class Column extends Component {
  render() {
    const blocks = filter(this.props.blocks);
    return blocks.length === 0 ? null : (
      <g>
        {blocks.map((block, i) => (
          <BlockComponent
            key={i}
            color={block.color}
            scanned={block.scanned}
            x={block.x}
            y={block.y}
          />
        ))}
      </g>
    );
  }
}

export default createColumn;
