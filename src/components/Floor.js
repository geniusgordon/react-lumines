import React, { Component } from 'react';
import Block from './Block';
import MatchedBlock from './MatchedBlock';
import createColumn from './Column';

const BlockColumn = createColumn(
  blocks => blocks.filter(block => block && !block.matched && !block.scanned),
  Block,
);

const MatchedColumn = createColumn(
  blocks => blocks.filter(block => block && block.matched),
  MatchedBlock,
);

const ScannedColumn = createColumn(
  blocks => blocks.filter(block => block && block.scanned),
  Block,
);

class Floor extends Component {
  render() {
    const { grid } = this.props;
    return (
      <g>
        {grid.map((blocks, i) => <BlockColumn key={i} blocks={blocks} />)}
        {grid.map((blocks, i) => <MatchedColumn key={i} blocks={blocks} />)}
        {grid.map((blocks, i) => <ScannedColumn key={i} blocks={blocks} />)}
      </g>
    );
  }
}

export default Floor;
