import React from 'react';
import { Dimension, Palette } from '../../constants';

export type ScanLineProps = {
  x: number;
  scannedCount: number;
};

const S = Dimension.SQUARE_SIZE;

const ScanLine: React.FC<ScanLineProps> = ({ x, scannedCount }) => {
  return (
    <g>
      <defs>
        <linearGradient id="scanLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
        </linearGradient>
      </defs>
      <rect
        x={x - Dimension.SCAN_LINE_WIDTH}
        y={S * 0.75}
        width={Dimension.SCAN_LINE_WIDTH}
        height={Dimension.GRID_HEIGHT - S * 0.75}
        fill="url(#scanLineGradient)"
      />
      <rect
        x={x - Dimension.SCAN_LINE_WIDTH}
        y={S * 0.75}
        width={Dimension.SCAN_LINE_WIDTH}
        height={S}
        fill={Palette.SCANNED}
        stroke={Palette.SCAN_LINE}
        strokeWidth={Dimension.SCAN_LINE_STROKE_WIDTH}
      />
      <text
        x={x - 2}
        y={S * 1.5}
        textAnchor="end"
        fill={Palette.SCAN_LINE}
        fontSize={S * 0.8}
      >
        {scannedCount}
      </text>
      <polygon
        points={`${x},${S * 0.75} ${x},${S * 1.75} ${x + S / 2},${S * 1.25}`}
        fill={Palette.SCANNED}
        stroke={Palette.SCAN_LINE}
        strokeWidth={Dimension.SCAN_LINE_STROKE_WIDTH}
      />
      <line
        x1={x}
        y1={S * 0.75}
        x2={x}
        y2={Dimension.GRID_HEIGHT}
        stroke={Palette.SCAN_LINE}
        strokeWidth={Dimension.SCAN_LINE_STROKE_WIDTH}
      />
    </g>
  );
};

export default ScanLine;
