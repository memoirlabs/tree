import type { LayoutPoint } from "../model/types";

export const roundTreeCoordinate = (value: number) => Math.round(value * 100) / 100;

export const centerPoint = (box: { x: number; y: number; width: number; height: number }): LayoutPoint => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export const topCenterPoint = (box: { x: number; y: number; width: number }): LayoutPoint => ({
  x: box.x + box.width / 2,
  y: box.y,
});

export const bottomCenterPoint = (box: { x: number; y: number; width: number; height: number }): LayoutPoint => ({
  x: box.x + box.width / 2,
  y: box.y + box.height,
});
