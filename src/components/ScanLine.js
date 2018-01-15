import React, { PureComponent } from 'react';
import { dimensions as d, colors } from '../constants';

class ScanLine extends PureComponent {
  render() {
    const { x, scanned } = this.props;
    const S = d.SQUARE_SIZE;
    return (
      <g>
        <defs>
          <linearGradient
            id="scanLineGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        <rect
          x={x - d.SCAN_LINE_WIDTH}
          y={0}
          width={d.SCAN_LINE_WIDTH}
          height={d.GRID_HEIGHT}
          fill="url(#scanLineGradient)"
        />
        <rect
          x={x - d.SCAN_LINE_WIDTH}
          y={0}
          width={d.SCAN_LINE_WIDTH}
          height={d.SQUARE_SIZE}
          fill={colors.SCANNED}
          stroke={colors.SCAN_LINE}
          strokeWidth={d.SCAN_LINE_STROKE_WIDTH}
        />
        <svg
          x={x - d.SCAN_LINE_WIDTH}
          y={0}
          width={d.SCAN_LINE_WIDTH}
          height={d.SQUARE_SIZE}
        >
          <text
            x="90%"
            y="50%"
            alignmentBaseline="middle"
            textAnchor="end"
            fill={colors.SCAN_LINE}
            fontSize={S}
            fontFamily="monospace"
          >
            {scanned}
          </text>
        </svg>
        <polygon
          points={`${x},0 ${x},${S} ${x + S / 2},${S / 2}`}
          fill={colors.SCANNED}
          stroke={colors.SCAN_LINE}
          strokeWidth={d.SCAN_LINE_STROKE_WIDTH}
        />
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={d.GRID_HEIGHT}
          stroke={colors.SCAN_LINE}
          strokeWidth={d.SCAN_LINE_STROKE_WIDTH}
        />
      </g>
    );
  }
}

export default ScanLine;
