import type { LayoutBounds, LayoutEdge } from "../model/types";

export interface LayoutInvariantInput {
  bounds: LayoutBounds;
  boxes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges?: LayoutEdge[];
}

export function collectLayoutInvariantViolations({ bounds, boxes }: LayoutInvariantInput): string[] {
  const violations: string[] = [];

  for (const box of boxes) {
    if (box.x < 0 || box.y < 0 || box.x + box.width > bounds.width || box.y + box.height > bounds.height) {
      violations.push(`Box ${box.id} is outside layout bounds.`);
    }
  }

  for (let aIndex = 0; aIndex < boxes.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < boxes.length; bIndex += 1) {
      const a = boxes[aIndex];
      const b = boxes[bIndex];
      if (!a || !b) continue;
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      if (overlaps) violations.push(`Boxes ${a.id} and ${b.id} overlap.`);
    }
  }

  return violations;
}

export function assertLayoutInvariants(input: LayoutInvariantInput): void {
  const violations = collectLayoutInvariantViolations(input);
  if (violations.length > 0) {
    throw new Error(`Invalid layout:\n${violations.join("\n")}`);
  }
}
