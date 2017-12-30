import React, { Component } from 'react';
import { dimensions, colors } from '../constants';

class MatchedBlock extends Component {
  render() {
    const color = this.props.color
      ? colors.SQUARE_DARK_MATCHED
      : colors.SQUARE_LIGHT_MATCHED;
    const size = dimensions.SQUARE_SIZE * 2;
    const stroke = colors.SQUARE_STROKE_MATCHED;
    const strokeWidth = dimensions.SQUARE_STROKE_WIDTH_MATCHED;
    return (
      <rect
        x={this.props.x}
        y={this.props.y}
        width={size}
        height={size}
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
}

export default MatchedBlock;
