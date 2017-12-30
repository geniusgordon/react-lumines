import React, { Component } from 'react';
import Block from './Block';
import { dimensions } from '../constants';

/*
 * 0 1
 * 3 2
 */

const getBlockX = i => (i < 2 ? i % 2 : 1 - i % 2) * dimensions.SQUARE_SIZE;

const getBlockY = i => Math.floor(i / 2) * dimensions.SQUARE_SIZE;

class Piece extends Component {
  render() {
    const { x, y, blocks } = this.props;
    return (
      <g>
        {blocks.map((color, i) => (
          <Block
            key={i}
            color={color}
            x={x + getBlockX(i)}
            y={y + getBlockY(i)}
          />
        ))}
      </g>
    );
  }
}

export default Piece;
