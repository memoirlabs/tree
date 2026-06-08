import {
  bottomCenterPoint,
  createBoundsFromBoxes,
  createTreeEdgePath,
  roundTreeCoordinate,
  topCenterPoint,
} from "../../layout-engine";
import { normalizeOrgChartInput } from "./org-chart-graph";
import { collectOrgChartSubtree, createOrgChartIndex } from "./org-chart-indexing";
import type { OrgChartRelative } from "./org-chart-indexing";
import type {
  BuildOrgChartLayoutInput,
  OrgChartLayoutCard,
  OrgChartLayoutEdge,
  OrgChartLayoutResult,
  OrgChartSize,
  OrgChartSpacing,
  PersonId,
} from "./types";

const defaultEstimatedCardSize: OrgChartSize = {
  width: 220,
  height: 80,
};

const defaultSpacing: OrgChartSpacing = {
  row: 80,
  column: 24,
  padding: 24,
};

interface Subtree {
  personId: PersonId;
  width: number;
  children: Subtree[];
}

const getSize = (
  measurements: Record<PersonId, OrgChartSize>,
  estimatedCardSize: OrgChartSize,
  personId: PersonId,
): OrgChartSize => measurements[personId] ?? estimatedCardSize;

const groupByParent = <Person>(relatives: OrgChartRelative<Person>[]) => {
  const reportsByParent = new Map<PersonId, OrgChartRelative<Person>[]>();
  for (const relative of relatives) {
    if (!relative.parentId) continue;
    const existing = reportsByParent.get(relative.parentId);
    if (existing) {
      existing.push(relative);
    } else {
      reportsByParent.set(relative.parentId, [relative]);
    }
  }
  return reportsByParent;
};

export function buildOrgChartLayout<Person>({
  graph,
  root,
  people,
  relationships,
  collapsed = [],
  measurements = {},
  spacing: spacingOverrides,
  maxDepth = null,
  lineShape = "orthogonal",
}: BuildOrgChartLayoutInput<Person>): OrgChartLayoutResult<Person> {
  const estimatedCardSize = defaultEstimatedCardSize;
  const spacing = { ...defaultSpacing, ...spacingOverrides };
  const normalized = normalizeOrgChartInput({ graph, people, relationships, root });
  root = normalized.root;
  people = normalized.people;
  relationships = normalized.relationships;
  const index = createOrgChartIndex(people, relationships);
  const relatives = collectOrgChartSubtree(index, root, { collapsed, maxDepth });
  if (relatives.length === 0) {
    return {
      cards: [],
      edges: [],
      bounds: { width: 0, height: 0 },
    };
  }

  const relativesById = new Map(relatives.map((relative) => [relative.personId, relative]));
  const reportsByParent = groupByParent(relatives);
  const rowHeights = new Map<number, number>();
  for (const relative of relatives) {
    const size = getSize(measurements, estimatedCardSize, relative.personId);
    rowHeights.set(relative.depth, Math.max(rowHeights.get(relative.depth) ?? 0, size.height));
  }

  const rowY = new Map<number, number>();
  let nextY = spacing.padding;
  for (const depth of Array.from(rowHeights.keys()).toSorted((a, b) => a - b)) {
    rowY.set(depth, nextY);
    nextY += (rowHeights.get(depth) ?? estimatedCardSize.height) + spacing.row;
  }

  const buildSubtree = (personId: PersonId): Subtree => {
    const reportIds = (reportsByParent.get(personId) ?? []).map((relative) => relative.personId);
    const children = reportIds.map(buildSubtree);
    const childWidth =
      children.reduce((sum, child) => sum + child.width, 0) + Math.max(0, children.length - 1) * spacing.column;
    const size = getSize(measurements, estimatedCardSize, personId);
    return {
      personId,
      width: Math.max(size.width, childWidth),
      children,
    };
  };

  const cards: OrgChartLayoutCard<Person>[] = [];
  const placeSubtree = (subtree: Subtree, left: number) => {
    const relative = relativesById.get(subtree.personId);
    if (!relative) return;
    const size = getSize(measurements, estimatedCardSize, subtree.personId);
    cards.push({
      personId: relative.personId,
      person: relative.person,
      depth: relative.depth,
      parentId: relative.parentId,
      x: roundTreeCoordinate(left + (subtree.width - size.width) / 2),
      y: roundTreeCoordinate(rowY.get(relative.depth) ?? spacing.padding),
      width: size.width,
      height: size.height,
    });

    const totalChildWidth =
      subtree.children.reduce((sum, child) => sum + child.width, 0) +
      Math.max(0, subtree.children.length - 1) * spacing.column;
    let childLeft = left + (subtree.width - totalChildWidth) / 2;
    for (const child of subtree.children) {
      placeSubtree(child, childLeft);
      childLeft += child.width + spacing.column;
    }
  };

  const rootSubtree = buildSubtree(root);
  placeSubtree(rootSubtree, spacing.padding);

  const cardsById = new Map(cards.map((card) => [card.personId, card]));
  const edges: OrgChartLayoutEdge[] = [];
  for (const card of cards) {
    if (!card.parentId) continue;
    const parentCard = cardsById.get(card.parentId);
    if (!parentCard) continue;
    const relationship = index.relationshipByReport.get(card.personId);
    const relationshipId =
      index.reportingLinkIdByReport.get(card.personId) ??
      (relationship?.reportIds.length === 1 ? relationship.id : undefined) ??
      `reporting-${card.parentId}-${card.personId}`;
    edges.push({
      id: relationshipId,
      path: createTreeEdgePath(bottomCenterPoint(parentCard), topCenterPoint(card), lineShape),
      kind: relationship?.relation ?? "manager",
      status: relationship?.status ?? "current",
      sourceId: card.parentId,
      targetId: card.personId,
    });
  }

  return {
    cards,
    edges,
    bounds: createBoundsFromBoxes(cards, spacing.padding),
  };
}
