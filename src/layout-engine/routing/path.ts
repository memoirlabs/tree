import type { LayoutLineShape, LayoutPoint } from "../model/types";
import { roundTreeCoordinate } from "../geometry/coordinates";

export type TreePoint = LayoutPoint;

export function createTreeEdgePath(start: LayoutPoint, end: LayoutPoint, lineShape: LayoutLineShape): string {
  const midY = roundTreeCoordinate((start.y + end.y) / 2);
  if (lineShape === "curved") {
    return `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} C ${roundTreeCoordinate(start.x)} ${midY}, ${roundTreeCoordinate(end.x)} ${midY}, ${roundTreeCoordinate(end.x)} ${roundTreeCoordinate(end.y)}`;
  }
  return `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} L ${roundTreeCoordinate(start.x)} ${midY} L ${roundTreeCoordinate(end.x)} ${midY} L ${roundTreeCoordinate(end.x)} ${roundTreeCoordinate(end.y)}`;
}
