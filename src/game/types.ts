export type Cord = {
  x: number;
  y: number;
};

export type MovingObject = {
  speed: number;
};

export enum Color {
  LIGHT = 1,
  DARK = 2,
}

export type Block = Color[][];

export type Cell = {
  color: Color;
  matched?: Boolean;
  scanned?: Boolean;
} | null;

export type Column = Cell[];
export type Grid = Column[];

export enum RotateDirection {
  CW = 1,
  CCW = -1,
}

export interface ActiveBlock extends Cord, MovingObject {
  block: Block;
}

export interface DetachedBlock extends Cord, MovingObject {
  color: Color;
}

export interface ScanLine extends Cord, MovingObject {}
