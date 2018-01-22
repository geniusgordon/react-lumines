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
  record,
  RESTART,
  FINISH,
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
import encode from '../actions/encode';
import { TIME_LIMIT, gameStates, dimensions, keys } from '../constants';

class Game extends Component {
  actions = [];

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.requestId = requestAnimationFrame(this.loop);
    this.dispatch(restart());
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    cancelAnimationFrame(this.requestId);
  }

  dispatch = action => {
    const { gameTime, dispatch } = this.props;
    if (
      action.type === RESTART ||
      action.type.startsWith('GAME.') ||
      action.type.startsWith('MOVE.')
    ) {
      this.actions.push({ ...action, time: Math.round(gameTime * 1e6) / 1e6 });
    }
    if (action.type === FINISH) {
      dispatch(record(this.actions.map(encode).join(' ')));
    }
    dispatch(action);
  };

  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);

    const { gameState, gameTime, scanLine } = this.props;
    const { dispatch } = this;

    if (gameState === gameStates.PLAYING && gameTime >= TIME_LIMIT) {
      dispatch(finish());
    }

    let dirty = false;
    const decomposedCurrent = this.checkCurrent(elapsed);
    if (decomposedCurrent) {
      dispatch(decompose(decomposedCurrent));
      dispatch(next());
      dirty = true;
    }

    let { lockedIndexes, lockedBlockes, grid } = this.checkDetached(elapsed);
    if (lockedIndexes.length > 0) {
      dispatch(lockDetached(lockedIndexes, lockedBlockes));
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
    const lockedBlockes = [];
    this.props.detached
      .map(block => ({
        ...block,
        y: nextBlockY(block, elapsed),
      }))
      .forEach((b, i) => {
        if (!isFreeBelow(b, grid)) {
          lockedIndexes.push(i);
          lockedBlockes.push(b);
          grid = addToGrid(b, grid);
        }
      });
    return { lockedIndexes, lockedBlockes, grid };
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
    const { gameState } = this.props;
    const { dispatch } = this;
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
