import type { FamilyTreeSize, OrgChartNode, PersonId } from "./types";

export interface OrgChartLayoutCard<Person> {
  personId: PersonId;
  person: Person;
  managerId?: PersonId;
  directReports: PersonId[];
  depth: number;
  generation: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OrgChartLayoutEdge {
  id: string;
  path: string;
  sourceId: PersonId;
  targetId: PersonId;
}

export interface OrgChartBounds {
  width: number;
  height: number;
}

export interface OrgChartLayoutResult<Person> {
  cards: OrgChartLayoutCard<Person>[];
  edges: OrgChartLayoutEdge[];
  bounds: OrgChartBounds;
}

export interface BuildOrgChartLayoutInput<Person> {
  nodes: OrgChartNode<Person>[];
  rootId?: PersonId;
  measurements?: Record<PersonId, FamilyTreeSize>;
}

const fallbackCardSize: FamilyTreeSize = {
  width: 220,
  height: 80,
};

const spacing = {
  row: 112,
  column: 36,
  padding: 32,
};

const round = (value: number) => Math.round(value * 100) / 100;

const getSize = (measurements: Record<PersonId, FamilyTreeSize>, personId: PersonId): FamilyTreeSize =>
  measurements[personId] ?? fallbackCardSize;

export function buildOrgChartLayout<Person>({
  nodes,
  rootId,
  measurements = {},
}: BuildOrgChartLayoutInput<Person>): OrgChartLayoutResult<Person> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<PersonId, OrgChartNode<Person>[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }

  const root =
    (rootId ? nodeById.get(rootId) : undefined) ??
    nodes.find((node) => !node.parentId || !nodeById.has(node.parentId)) ??
    nodes[0];

  if (!root) {
    return {
      cards: [],
      edges: [],
      bounds: { width: 0, height: 0 },
    };
  }

  const cards: OrgChartLayoutCard<Person>[] = [];
  const visited = new Set<PersonId>();
  let nextLeafX = 0;

  const place = (node: OrgChartNode<Person>, depth: number): OrgChartLayoutCard<Person> => {
    if (visited.has(node.id)) {
      const size = getSize(measurements, node.id);
      return {
        personId: node.id,
        person: node.person,
        managerId: node.parentId ?? undefined,
        directReports: [],
        depth,
        generation: depth,
        x: nextLeafX,
        y: depth * (fallbackCardSize.height + spacing.row),
        width: size.width,
        height: size.height,
      };
    }

    visited.add(node.id);
    const directReports = childrenByParent.get(node.id) ?? [];
    const childCards = directReports.map((child) => place(child, depth + 1));
    const size = getSize(measurements, node.id);
    const x =
      childCards.length > 0
        ? (childCards[0]!.x + childCards[childCards.length - 1]!.x) / 2
        : nextLeafX;

    if (childCards.length === 0) {
      nextLeafX += size.width + spacing.column;
    }

    const card: OrgChartLayoutCard<Person> = {
      personId: node.id,
      person: node.person,
      managerId: node.parentId ?? undefined,
      directReports: directReports.map((child) => child.id),
      depth,
      generation: depth,
      x,
      y: depth * (fallbackCardSize.height + spacing.row),
      width: size.width,
      height: size.height,
    };

    cards.push(card);
    return card;
  };

  place(root, 0);

  if (cards.length === 0) {
    return {
      cards,
      edges: [],
      bounds: { width: 0, height: 0 },
    };
  }

  const minX = Math.min(...cards.map((card) => card.x - card.width / 2));
  const maxX = Math.max(...cards.map((card) => card.x + card.width / 2));
  const minY = Math.min(...cards.map((card) => card.y));
  const maxY = Math.max(...cards.map((card) => card.y + card.height));
  const offsetX = spacing.padding - minX;
  const offsetY = spacing.padding - minY;

  for (const card of cards) {
    card.x = round(card.x - card.width / 2 + offsetX);
    card.y = round(card.y + offsetY);
  }

  const cardById = new Map(cards.map((card) => [card.personId, card]));
  const edges: OrgChartLayoutEdge[] = [];
  for (const card of cards) {
    for (const childId of card.directReports) {
      const child = cardById.get(childId);
      if (!child) continue;
      const startX = card.x + card.width / 2;
      const startY = card.y + card.height;
      const endX = child.x + child.width / 2;
      const endY = child.y;
      const midY = startY + Math.max(24, (endY - startY) / 2);
      edges.push({
        id: `${card.personId}->${child.personId}`,
        path: `M ${round(startX)} ${round(startY)} L ${round(startX)} ${round(midY)} L ${round(endX)} ${round(midY)} L ${round(endX)} ${round(endY)}`,
        sourceId: card.personId,
        targetId: child.personId,
      });
    }
  }

  return {
    cards,
    edges,
    bounds: {
      width: round(maxX - minX + spacing.padding * 2),
      height: round(maxY - minY + spacing.padding * 2),
    },
  };
}
