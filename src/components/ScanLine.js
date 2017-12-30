import React, { Component } from 'react';
import { dimensions } from '../constants';

class ScanLine extends Component {
  render() {
    return (
      <g className="lumines-scanline">
        <defs>
          <linearGradient
            id="scanLineGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="97%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,1)" />
          </linearGradient>
        </defs>
        <rect
          x={this.props.x - dimensions.SCAN_LINE_WIDTH}
          y={2 * dimensions.SQUARE_SIZE}
          width={dimensions.SCAN_LINE_WIDTH}
          height={dimensions.GRID_HEIGHT - 2 * dimensions.SQUARE_SIZE}
          fill="url(#scanLineGradient)"
        />
      </g>
    );
  }
}

export default ScanLine;
