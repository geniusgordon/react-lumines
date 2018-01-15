import React, { Component } from 'react';
import Column from './Column';
import MatchedBlock from './MatchedBlock';

class Floor extends Component {
  render() {
    const { grid } = this.props;
    return (
      <g>
        {grid.map((blocks, i) => (
          <Column key={i} blocks={blocks.filter(block => block)} />
        ))}
        {grid.map((blocks, i) => (
          <Column
            key={i}
            blocks={blocks.filter(
              block => block && block.matched && block.head,
            )}
            BlockComponent={MatchedBlock}
          />
        ))}
        {grid.map((blocks, i) => (
          <Column
            key={i}
            blocks={blocks.filter(block => block && block.scanned)}
          />
        ))}
      </g>
    );
  }
}

export default Floor;
