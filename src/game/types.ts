export type Cord = {
  x: number;
  y: number;
};

export interface MovingObject extends Cord {
  speed: number;
}

export enum Color {
  LIGHT = 1,
  DARK = 2,
}

export type Block = Color[][];

export type GridIndex = {
  col: number;
  row: number;
};

export type Cell = {
  color: Color;
  matchedBlock?: GridIndex;
  scanned?: Boolean;
} | null;

export type Column = Cell[];
export type Grid = Column[];

export enum RotateDirection {
  CW = 1,
  CCW = -1,
}

export interface ActiveBlock extends MovingObject {
  block: Block;
}

export interface DetachedBlock extends MovingObject {
  color: Color;
}

export interface ScanLine {
  x: number;
  speed: number;
}

export type Game = {
  queue: Block[];
  activeBlock: ActiveBlock;
  grid: Grid;
  detachedBlocks: DetachedBlock[];
  scanLine: ScanLine;
  scannedCount: number;
};
