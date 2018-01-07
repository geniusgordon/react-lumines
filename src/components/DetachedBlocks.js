import React, { Component } from 'react';
import Block from './Block';

class DetachedBlocks extends Component {
  render() {
    return (
      <g>
        {this.props.blocks.map((block, i) => (
          <Block key={i} color={block.color} x={block.x} y={block.y} />
        ))}
      </g>
    );
  }
}

export default DetachedBlocks;
