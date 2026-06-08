export interface LayoutBoxSize {
  width: number;
  height: number;
}

export interface LayoutBounds {
  width: number;
  height: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutSpacing {
  row: number;
  column: number;
  padding: number;
}

export type LayoutLineShape = "orthogonal" | "curved";

export interface LayoutCardBase<Data = unknown> extends LayoutBoxSize {
  id: string;
  data?: Data;
  x: number;
  y: number;
}

export interface LayoutEdge {
  id: string;
  path: string;
  kind?: string;
  status?: string;
  sourceId?: string;
  targetId?: string;
}
