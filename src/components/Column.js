import React, { PureComponent } from 'react';
import Block from './Block';
import { dimensions, colors } from '../constants';

class Column extends PureComponent {
  render() {
    const { blocks, BlockComponent = Block } = this.props;
    return blocks.length > 0
      ? blocks.map(
          (block, i) =>
            block ? (
              <BlockComponent
                key={i}
                color={block.color}
                x={block.x}
                y={block.y}
                scanned={block.scanned}
              />
            ) : null,
        )
      : null;
  }
}

export default Column;
