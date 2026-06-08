import { roundTreeCoordinate } from "../../geometry/coordinates";
import type { LayoutBoxSize, LayoutBounds, LayoutSpacing } from "../../model/types";

export interface TreeLayeredBoxInput<Data = unknown> extends LayoutBoxSize {
  id: string;
  data?: Data;
  anchorIds?: string[];
  anchorPoints?: TreeLayeredAnchorPointInput[];
}

export interface TreeLayeredAnchorPointInput {
  id: string;
  offsetX: number;
}

export interface TreeLayeredBox<Data = unknown> extends TreeLayeredBoxInput<Data> {
  x: number;
  y: number;
}

export interface BuildLayeredTreeLayoutInput<Data = unknown> {
  layers: TreeLayeredBoxInput<Data>[][];
  spacing: LayoutSpacing;
}

export interface BuildLayeredTreeLayoutResult<Data = unknown> {
  boxes: TreeLayeredBox<Data>[];
  bounds: LayoutBounds;
}

const centerOf = (box: Pick<TreeLayeredBox, "x" | "width">) => box.x + box.width / 2;

const solveNonOverlappingCenters = <Data>(layer: TreeLayeredBoxInput<Data>[], targets: number[], columnGap: number) => {
  const offsets: number[] = [];
  let offset = 0;
  for (let index = 0; index < layer.length; index += 1) {
    offsets.push(offset);
    const current = layer[index];
    const next = layer[index + 1];
    if (current && next) offset += current.width / 2 + columnGap + next.width / 2;
  }

  const blocks: Array<{ start: number; end: number; sum: number; weight: number; value: number }> = [];
  targets.forEach((target, index) => {
    blocks.push({
      start: index,
      end: index,
      sum: target - (offsets[index] ?? 0),
      weight: 1,
      value: target - (offsets[index] ?? 0),
    });

    while (blocks.length >= 2) {
      const last = blocks[blocks.length - 1];
      const previous = blocks[blocks.length - 2];
      if (!last || !previous || previous.value <= last.value) break;
      previous.end = last.end;
      previous.sum += last.sum;
      previous.weight += last.weight;
      previous.value = previous.sum / previous.weight;
      blocks.pop();
    }
  });

  const solved: number[] = [];
  for (const block of blocks) {
    for (let index = block.start; index <= block.end; index += 1) {
      solved[index] = block.value + (offsets[index] ?? 0);
    }
  }
  return solved;
};

const placeLayer = <Data>(
  layer: TreeLayeredBoxInput<Data>[],
  y: number,
  columnGap: number,
  anchorCenterById: Map<string, number>,
): TreeLayeredBox<Data>[] => {
  if (layer.length === 0) return [];

  const totalWidth =
    layer.reduce((sum, box) => sum + box.width, 0) + Math.max(0, layer.length - 1) * columnGap;
  let nextX = -totalWidth / 2;
  const targets = layer.map((box) => {
    const anchorCenters = (box.anchorIds ?? [])
      .map((anchorId) => anchorCenterById.get(anchorId))
      .filter((anchorCenter): anchorCenter is number => anchorCenter !== undefined);
    const defaultCenter = nextX + box.width / 2;
    nextX += box.width + columnGap;
    if (anchorCenters.length === 0) return defaultCenter;
    return anchorCenters.reduce((sum, anchorCenter) => sum + anchorCenter, 0) / anchorCenters.length;
  });
  const centers = solveNonOverlappingCenters(layer, targets, columnGap);

  return layer.map((box, index) => ({
    ...box,
    x: roundTreeCoordinate((centers[index] ?? 0) - box.width / 2),
    y: roundTreeCoordinate(y),
  }));
};

export function buildLayeredTreeLayout<Data = unknown>({
  layers,
  spacing,
}: BuildLayeredTreeLayoutInput<Data>): BuildLayeredTreeLayoutResult<Data> {
  const boxes: TreeLayeredBox<Data>[] = [];
  const anchorCenterById = new Map<string, number>();
  let y = 0;

  for (const layer of layers) {
    if (layer.length === 0) continue;
    const placedLayer = placeLayer(layer, y, spacing.column, anchorCenterById);
    for (const box of placedLayer) {
      boxes.push(box);
      anchorCenterById.set(box.id, centerOf(box));
      for (const anchorPoint of box.anchorPoints ?? []) {
        anchorCenterById.set(anchorPoint.id, box.x + anchorPoint.offsetX);
      }
    }
    y += Math.max(...layer.map((box) => box.height)) + spacing.row;
  }

  if (boxes.length === 0) {
    return {
      boxes,
      bounds: { width: 0, height: 0 },
    };
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const offsetX = spacing.padding - minX;
  const offsetY = spacing.padding - minY;

  for (const box of boxes) {
    box.x = roundTreeCoordinate(box.x + offsetX);
    box.y = roundTreeCoordinate(box.y + offsetY);
  }

  return {
    boxes,
    bounds: {
      width: roundTreeCoordinate(maxX - minX + spacing.padding * 2),
      height: roundTreeCoordinate(maxY - minY + spacing.padding * 2),
    },
  };
}
