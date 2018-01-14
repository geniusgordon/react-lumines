import React, { PureComponent } from 'react';
import Piece from './Piece';
import { dimensions } from '../constants';

class Queue extends PureComponent {
  render() {
    return (
      <g>
        {this.props.queue.map((blocks, i) => (
          <Piece
            key={i}
            blocks={blocks}
            x={0}
            y={i * dimensions.SQUARE_SIZE * 3}
          />
        ))}
      </g>
    );
  }
}

export default Queue;
