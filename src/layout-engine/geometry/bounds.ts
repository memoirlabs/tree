import { roundTreeCoordinate } from "./coordinates";
import type { LayoutBounds } from "../model/types";

export function createBoundsFromBoxes(
  boxes: Array<{ x: number; y: number; width: number; height: number }>,
  padding: number,
): LayoutBounds {
  if (boxes.length === 0) return { width: 0, height: 0 };

  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    width: roundTreeCoordinate(maxX + padding),
    height: roundTreeCoordinate(maxY + padding),
  };
}
