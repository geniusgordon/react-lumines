export enum Color {
  LIGHT,
  DARK,
}

export type Block = Color[][];
export type Cell = Color | null;
export type Column = Cell[];
export type Row = Cell[];
export type Grid = Cell[][];

export enum RotateDirection {
  CW = 1,
  CCW = -1,
}

export type ActiveBlock = {
  block: Block;
};
