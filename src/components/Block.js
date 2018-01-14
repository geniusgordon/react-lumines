import React, { PureComponent } from 'react';
import { dimensions, colors } from '../constants';

class Block extends PureComponent {
  render() {
    const color = this.props.scanned
      ? colors.SQUARE_SCANNED
      : this.props.color ? colors.SQUARE_DARK : colors.SQUARE_LIGHT;
    const size = dimensions.SQUARE_SIZE;
    const stroke = colors.SQUARE_STROKE;
    const strokeWidth = dimensions.SQUARE_STROKE_WIDTH;
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

export default Block;
