import React, { Component } from 'react';
import styled from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template: repeat(10, 1fr) / repeat(16, 1fr);
`;

class Field extends Component {
  render() {
    return (
      <Grid>
        <div>A</div>
        <div>A</div>
        <div>A</div>
        <div>A</div>
        <div>A</div>
        <div>A</div>
        <div>A</div>
        <div>A</div>
      </Grid>
    );
  }
}

export default Field;
