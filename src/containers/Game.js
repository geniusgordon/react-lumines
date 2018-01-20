import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from '../components/Interface';
import {
  loop,
  restart,
  finish,
  rotate,
  move,
  drop,
  decompose,
  next,
  lockDetached,
  scan,
  updateMatched,
  removeScanned,
} from '../actions';
import {
  xToCol,
  nextBlockY,
  isFreeBelow,
  addToGrid,
  willCollide,
  willEnterNextRow,
  willEnterNextColumn,
  decomposePiece,
} from '../utils';
import { gameStates, dimensions, keys } from '../constants';

class Game extends Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.requestId = requestAnimationFrame(this.loop);
    this.props.dispatch(restart());
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    cancelAnimationFrame(this.requestId);
  }
  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);

    const { gameState, gameTime, scanLine, dispatch } = this.props;
    if (gameState === gameStates.PLAYING && gameTime >= 90) {
      dispatch(finish());
    }

    let dirty = false;
    const decomposedCurrent = this.checkCurrent(elapsed);
    if (decomposedCurrent) {
      dispatch(decompose(decomposedCurrent));
      dispatch(next());
      dirty = true;
    }

    let { lockedIndexes, grid } = this.checkDetached(elapsed);
    if (lockedIndexes.length > 0) {
      dispatch(lockDetached(lockedIndexes));
      dirty = true;
    }

    if (dirty) {
      dispatch(updateMatched());
    }

    const scanned = this.scan(elapsed, grid);
    if (scanned) {
      const col = (xToCol(scanLine.x) + 1) % dimensions.GRID_COLUMNS;
      const end = col === dimensions.GRID_COLUMNS - 1;
      if (scanned.length > 0 || end) {
        dispatch(scan(scanned, end));
      }
      if ((scanned.length === 0 || end) && this.props.scannedGroup > 0) {
        dispatch(removeScanned());
      }
    }

    dispatch(loop(now, elapsed));
    this.requestId = requestAnimationFrame(this.loop);
  };
  checkCurrent = elapsed => {
    const { current, grid } = this.props;
    const cur = {
      ...current,
      y: nextBlockY(current, elapsed),
    };
    if (
      (cur.dropped && willCollide(cur, grid)) ||
      (willEnterNextRow(cur, elapsed) && willCollide(cur, grid))
    ) {
      return decomposePiece(cur, grid);
    }
    return false;
  };
  checkDetached = elapsed => {
    let { grid } = this.props;
    const lockedIndexes = [];
    this.props.detached
      .map(block => ({
        ...block,
        y: nextBlockY(block, elapsed),
      }))
      .forEach((d, i) => {
        if (!isFreeBelow(d, grid)) {
          lockedIndexes.push(i);
          grid = addToGrid(d, grid);
        }
      });
    return { lockedIndexes, grid };
  };
  scan = (elapsed, grid) => {
    const { scanLine } = this.props;
    const scanned = [];
    if (willEnterNextColumn(scanLine, elapsed)) {
      const col = (xToCol(scanLine.x) + 1) % dimensions.GRID_COLUMNS;
      for (let i = 0; i < dimensions.GRID_COLUMNS; i++) {
        for (let j = 0; j < dimensions.GRID_ROWS; j++) {
          const b = grid[i][j];
          if (b && b.matched && !b.scanned && xToCol(b.x) === col) {
            scanned.push(b);
          }
        }
      }
      return scanned;
    }
    return false;
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
      scannedUtilNow,
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
        scanned={scannedUtilNow}
        gameTime={gameTime}
        score={score}
      />
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Game);
