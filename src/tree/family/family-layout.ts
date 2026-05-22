import { roundTreeCoordinate } from "../core";
import { routeFamilyEdges } from "./family-edge-routing";
import { collectFamilyNeighborhood, createFamilyIndex } from "./family-indexing";
import type { FamilyRelative } from "./family-indexing";
import type { BuildFamilyTreeLayoutInput, FamilyTreeLayoutCard, FamilyTreeLayoutResult } from "./layout-types";
import type { ComputedRelation, FamilyTreeSize, FamilyTreeSpacing, PersonId } from "./types";

const defaultFallbackCardSize: FamilyTreeSize = {
  width: 220,
  height: 80,
};

const defaultSpacing: FamilyTreeSpacing = {
  row: 120,
  column: 32,
  padding: 32,
};

const uniqueRelatives = <Person>(relatives: FamilyRelative<Person>[]) => {
  const seen = new Set<PersonId>();
  const compacted: FamilyRelative<Person>[] = [];
  for (const relative of relatives) {
    if (seen.has(relative.personId)) continue;
    seen.add(relative.personId);
    compacted.push(relative);
  }
  return compacted;
};

const getSize = (
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  personId: PersonId,
): FamilyTreeSize => measurements[personId] ?? fallbackCardSize;

const shouldHideCollapsedRelative = <Person>(
  relative: FamilyRelative<Person>,
  subject: PersonId,
  collapsedRelatives: Map<PersonId, ComputedRelation>,
): boolean => {
  if (relative.personId === subject) return false;

  for (const [collapsedId, collapsedRelation] of collapsedRelatives) {
    if (collapsedId === subject) return true;

    if (
      collapsedRelation.side === "ancestor" &&
      relative.relation.side === "ancestor" &&
      relative.relation.generation < collapsedRelation.generation
    ) {
      return true;
    }

    if (
      collapsedRelation.side === "descendant" &&
      relative.relation.side === "descendant" &&
      relative.relation.generation > collapsedRelation.generation
    ) {
      return true;
    }
  }

  return false;
};

const placeRow = <Person>(
  relatives: FamilyRelative<Person>[],
  y: number,
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  columnGap: number,
): FamilyTreeLayoutCard<Person>[] => {
  if (relatives.length === 0) return [];

  const sizes = relatives.map((relative) => getSize(measurements, fallbackCardSize, relative.personId));
  const totalWidth =
    sizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, relatives.length - 1) * columnGap;
  let x = -totalWidth / 2;

  return relatives.map((relative, index) => {
    const size = sizes[index] ?? fallbackCardSize;
    const card: FamilyTreeLayoutCard<Person> = {
      personId: relative.personId,
      person: relative.person,
      relation: relative.relation,
      x,
      y,
      width: size.width,
      height: size.height,
    };
    x += size.width + columnGap;
    return card;
  });
};

export function buildFamilyTreeLayout<Person>({
  subject,
  people,
  relationships,
  collapsed = [],
  measurements = {},
  spacing: spacingOverrides,
  limits,
  lineShape = "orthogonal",
}: BuildFamilyTreeLayoutInput<Person>): FamilyTreeLayoutResult<Person> {
  const fallbackCardSize = defaultFallbackCardSize;
  const spacing = { ...defaultSpacing, ...spacingOverrides };
  const index = createFamilyIndex(people, relationships);
  const neighborhood = collectFamilyNeighborhood(index, subject, limits);
  if (!neighborhood) {
    return {
      cards: [],
      edges: [],
      bounds: { width: 0, height: 0 },
    };
  }

  const rows = [
    uniqueRelatives(neighborhood.grandparents),
    uniqueRelatives(neighborhood.parents),
    uniqueRelatives([
      ...neighborhood.siblings,
      ...neighborhood.halfSiblings,
      neighborhood.self,
      ...neighborhood.partners,
    ]),
    uniqueRelatives(neighborhood.children),
    uniqueRelatives(neighborhood.grandchildren),
  ].filter((row) => row.length > 0);

  const relativesById = new Map<PersonId, ComputedRelation>();
  for (const row of rows) {
    for (const relative of row) {
      relativesById.set(relative.personId, relative.relation);
    }
  }
  const collapsedRelatives = new Map<PersonId, ComputedRelation>();
  for (const personId of collapsed) {
    const relation = relativesById.get(personId);
    if (relation) collapsedRelatives.set(personId, relation);
  }
  const visibleRows = rows
    .map((row) => row.filter((relative) => !shouldHideCollapsedRelative(relative, subject, collapsedRelatives)))
    .filter((row) => row.length > 0);

  let y = 0;
  const cards: FamilyTreeLayoutCard<Person>[] = [];

  for (const row of visibleRows) {
    const rowCards = placeRow(row, y, measurements, fallbackCardSize, spacing.column);
    cards.push(...rowCards);
    const maxHeight = rowCards.reduce((height, card) => Math.max(height, card.height), 0);
    y += maxHeight + spacing.row;
  }

  const subjectCard = cards.find((card) => card.personId === subject);
  const subjectShift = subjectCard ? -(subjectCard.x + subjectCard.width / 2) : 0;
  for (const card of cards) {
    card.x += subjectShift;
  }

  if (cards.length === 0) {
    return {
      cards,
      edges: [],
      bounds: { width: 0, height: 0 },
    };
  }

  const minX = Math.min(...cards.map((card) => card.x));
  const minY = Math.min(...cards.map((card) => card.y));
  const maxX = Math.max(...cards.map((card) => card.x + card.width));
  const maxY = Math.max(...cards.map((card) => card.y + card.height));
  const offsetX = spacing.padding - minX;
  const offsetY = spacing.padding - minY;

  for (const card of cards) {
    card.x = roundTreeCoordinate(card.x + offsetX);
    card.y = roundTreeCoordinate(card.y + offsetY);
  }

  return {
    cards,
    edges: routeFamilyEdges(cards, relationships, { lineShape }),
    bounds: {
      width: roundTreeCoordinate(maxX - minX + spacing.padding * 2),
      height: roundTreeCoordinate(maxY - minY + spacing.padding * 2),
    },
  };
}
