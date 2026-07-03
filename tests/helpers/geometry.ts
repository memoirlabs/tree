export interface PathSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface RectLike {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function pathSegments(path: string): PathSegment[] {
  const tokens = path.split(/\s+/);
  const segments: PathSegment[] = [];
  let current: { x: number; y: number } | null = null;

  for (let index = 0; index < tokens.length; index += 1) {
    const command = tokens[index];
    if (command !== "M" && command !== "L") continue;
    const x = Number(tokens[index + 1]);
    const y = Number(tokens[index + 2]);
    index += 2;
    if (command === "L" && current) {
      segments.push({ x1: current.x, y1: current.y, x2: x, y2: y });
    }
    current = { x, y };
  }

  return segments;
}

export function segmentCrossesCardInterior(segment: PathSegment, card: RectLike): boolean {
  const left = card.x + 1;
  const right = card.x + card.width - 1;
  const top = card.y + 1;
  const bottom = card.y + card.height - 1;

  if (segment.y1 === segment.y2) {
    const minX = Math.min(segment.x1, segment.x2);
    const maxX = Math.max(segment.x1, segment.x2);
    return segment.y1 > top && segment.y1 < bottom && maxX > left && minX < right;
  }

  if (segment.x1 === segment.x2) {
    const minY = Math.min(segment.y1, segment.y2);
    const maxY = Math.max(segment.y1, segment.y2);
    return segment.x1 > left && segment.x1 < right && maxY > top && minY < bottom;
  }

  return false;
}
