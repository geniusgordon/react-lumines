import React, { Component } from 'react';
import Piece from './Piece';
import { dimensions } from '../constants';

class Queue extends Component {
  render() {
    return (
      <g>
        {this.props.queue.map((blocks, i) => (
          <Piece key={i} blocks={blocks} x={0} y={i * dimensions.SQUARE_SIZE * 2.5} />
        ))}
      </g>
    );
  }
}

export default Queue;
