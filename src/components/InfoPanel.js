import React, { PureComponent } from 'react';
import Group from './Group';
import Info from './Info';
import { dimensions } from '../constants';

class InfoPanel extends PureComponent {
  render() {
    const time = 90 - Math.floor(this.props.time);
    const { score } = this.props
    return (
      <g>
        <Info label="Time" value={time} />
        <Group y={dimensions.SQUARE_SIZE * 2}>
          <Info label="Score" value={score} />
        </Group>
      </g>
    );
  }
}

export default InfoPanel;
