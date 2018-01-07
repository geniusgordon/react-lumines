import React, { Component } from 'react';

class Column extends Component {
  render() {
    const BlockComponent = this.props.Component;
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

export default Column;
