import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from '../components/Interface';
import {
  loop,
  finish,
  rotate,
  move,
  drop,
  next,
  scan,
  updateDetached,
  updateGrid,
} from '../actions';
import {
  xToCol,
  nextBlockY,
  isFreeBelow,
  addToGrid,
  removeFromGrid,
  willCollide,
  willEnterNextRow,
  willEnterNextColumn,
  decomposePiece,
  updateMatchedBlocks,
} from '../utils';
import { gameStates, dimensions, keys, speeds } from '../constants';

class Game extends Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.requestId = requestAnimationFrame(this.loop);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    cancelAnimationFrame(this.requestId);
  }
  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);
    let dirty = false;

    const { gameState, gameTime, dispatch } = this.props;
    if (gameState === gameStates.PLAYING && gameTime >= 90) {
      dispatch(finish());
    }

    const curResult = this.updateCurrent(elapsed);
    if (curResult) {
      dirty = true;
    }

    const detResult = this.updateDetached(elapsed, curResult.decomposed);
    if (detResult) {
      dirty = true;
    }

    let grid = detResult.grid || this.props.grid;
    const detached = detResult.detached || this.props.detached;
    if (dirty) {
      const locked = curResult.locked || [];
      grid = locked.reduce((g, b) => addToGrid(b, g), grid);
      grid = updateMatchedBlocks(grid);
      dispatch(updateGrid(grid));
    }

    const scanned = this.scan(elapsed, grid);

    if (scanned && scanned.length === 0) {
      this.removeScanned(grid, detached);
    }

    dispatch(loop(now, elapsed));
    this.requestId = requestAnimationFrame(this.loop);
  };
  updateCurrent = elapsed => {
    const { current, grid, dispatch } = this.props;
    const cur = {
      ...current,
      y: nextBlockY(current, elapsed),
    };
    if (
      (cur.dropped && willCollide(cur, grid)) ||
      (willEnterNextRow(cur, elapsed) && willCollide(cur, grid))
    ) {
      dispatch(next());
      return decomposePiece(cur, grid);
    }
    return false;
  };
  updateDetached = (elapsed, decomposed = []) => {
    const { dispatch } = this.props;
    let { grid } = this.props;
    const detached = this.props.detached.map(block => ({
      ...block,
      y: nextBlockY(block, elapsed),
    }));
    const nextDetached = decomposed.map(block => ({
      ...block,
      speed: speeds.DROP_DETACHED,
    }));
    let dirty = false;
    detached.forEach(d => {
      if (isFreeBelow(d, grid)) {
        nextDetached.push(d);
      } else {
        grid = addToGrid(d, grid);
        dirty = true;
      }
    });
    if (decomposed.length > 0 || dirty) {
      dispatch(updateDetached(nextDetached));
    }
    return dirty ? { grid, detached: nextDetached } : false;
  };
  scan = (elapsed, grid) => {
    const { scanLine, dispatch } = this.props;
    const scanned = [];
    if (willEnterNextColumn(scanLine, elapsed)) {
      const col = (xToCol(scanLine.x) + 1) % dimensions.GRID_COLUMNS;
      for (let i = 0; i < dimensions.GRID_COLUMNS; i++) {
        for (let j = 0; j < dimensions.GRID_ROWS; j++) {
          const b = grid[i][j];
          if (b && b.matched && !b.scanned && xToCol(b.x) === col) {
            grid = addToGrid({ ...b, scanned: true }, grid);
            scanned.push(b);
          }
        }
      }
      dispatch(scan(scanned, col === dimensions.GRID_COLUMNS - 1));
      if (scanned.length > 0) {
        dispatch(updateGrid(grid));
      }
      return scanned;
    }
    return false;
  };
  removeScanned = (grid, detached) => {
    const nextDetached = [...detached];
    let dirty = false;
    for (let i = 0; i < dimensions.GRID_COLUMNS; i++) {
      for (let j = dimensions.GRID_ROWS - 1; j >= 0; j--) {
        if (grid[i][j] && grid[i][j].scanned) {
          grid = removeFromGrid(grid[i][j], grid);
          dirty = true;
        }
        if (grid[i][j] && grid[i][j + 1] === null) {
          nextDetached.push({ ...grid[i][j], speed: speeds.DROP_DETACHED });
          grid = removeFromGrid(grid[i][j], grid);
          dirty = true;
        }
      }
    }
    if (dirty) {
      grid = updateMatchedBlocks(grid);
      this.props.dispatch(updateGrid(grid));
      this.props.dispatch(updateDetached(nextDetached));
    }
  };
  handleKeyDown = e => {
    const { gameState, dispatch } = this.props;
    if (gameState === gameStates.PLAYING) {
      switch (e.keyCode) {
        case keys.Z:
          dispatch(rotate(-1));
          break;
        case keys.X:
        case keys.UP:
          dispatch(rotate(1));
          break;
        case keys.LEFT:
          dispatch(move(-1));
          break;
        case keys.RIGHT:
          dispatch(move(1));
          break;
        case keys.DOWN:
        case keys.SPACE:
          dispatch(drop());
          break;
        default:
          break;
      }
    }
  };
  render() {
    const {
      queue,
      grid,
      current,
      scanLine,
      detached,
      scanned,
      gameTime,
      score,
    } = this.props;
    return (
      <Interface
        queue={queue}
        grid={grid}
        current={current}
        scanLine={scanLine}
        detached={detached}
        scanned={scanned}
        gameTime={gameTime}
        score={score}
      />
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Game);
