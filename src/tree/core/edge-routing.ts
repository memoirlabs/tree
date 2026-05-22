import type { TreeLineShape } from "./types";

export const roundTreeCoordinate = (value: number) => Math.round(value * 100) / 100;

export interface TreePoint {
  x: number;
  y: number;
}

export const centerPoint = (card: { x: number; y: number; width: number; height: number }): TreePoint => ({
  x: card.x + card.width / 2,
  y: card.y + card.height / 2,
});

export const topCenterPoint = (card: { x: number; y: number; width: number }): TreePoint => ({
  x: card.x + card.width / 2,
  y: card.y,
});

export const bottomCenterPoint = (card: { x: number; y: number; width: number; height: number }): TreePoint => ({
  x: card.x + card.width / 2,
  y: card.y + card.height,
});

export function createTreeEdgePath(start: TreePoint, end: TreePoint, lineShape: TreeLineShape): string {
  const midY = roundTreeCoordinate((start.y + end.y) / 2);
  if (lineShape === "curved") {
    return `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} C ${roundTreeCoordinate(start.x)} ${midY}, ${roundTreeCoordinate(end.x)} ${midY}, ${roundTreeCoordinate(end.x)} ${roundTreeCoordinate(end.y)}`;
  }
  return `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} L ${roundTreeCoordinate(start.x)} ${midY} L ${roundTreeCoordinate(end.x)} ${midY} L ${roundTreeCoordinate(end.x)} ${roundTreeCoordinate(end.y)}`;
}
