import React, { Component } from 'react';
import { dimensions, colors } from '../constants';

class Block extends Component {
  render() {
    const color = this.props.color ? colors.SQUARE_DARK : colors.SQUARE_LIGHT;
    return (
      <rect
        x={this.props.x}
        y={this.props.y}
        width={dimensions.SQUARE_SIZE}
        height={dimensions.SQUARE_SIZE}
        fill={color}
        stroke={colors.SQUARE_STROKE}
        strokeWidth={dimensions.SQUARE_STROKE_WIDTH}
      />
    );
  }
}

export default Block;
