import React, { PureComponent } from 'react';

class Countdown extends PureComponent {
  render() {
    const { x, y } = this.props;
    const time = this.props.time * -1 / 0.8;
    return time > 0 ? (
      <g>
        <circle
          cx={x + 10}
          cy={y - 10}
          r={20}
          fill="transparent"
          stroke="#FFFFFF"
          strokeWidth={1}
          strokeDasharray={150}
          strokeDashoffset={(time - Math.floor(time)) * 150}
          strokeLinecap="round"
        />
        <text x={x + 1} y={y} fontSize={30} fill="#FFFFFF">
          {Math.floor(time) + 1}
        </text>
      </g>
    ) : null;
  }
}

export default Countdown;
