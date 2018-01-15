import React, { PureComponent } from 'react';
import { colors } from '../constants';

class Info extends PureComponent {
  render() {
    const { label, value } = this.props;
    return (
      <g>
        <text fill={colors.LABEL} fontSize={5}>
          {label}
        </text>
        <text fill={colors.INFO} y={11} fontSize={15} fontFamily="monospace">
          {value}
        </text>
      </g>
    );
  }
}

export default Info;
