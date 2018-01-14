import React, { PureComponent } from 'react';
import Block from './Block';

class DetachedBlocks extends PureComponent {
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
