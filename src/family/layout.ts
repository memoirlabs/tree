import { collectFamilyNeighborhood, createFamilyIndex } from "./indexing";
import { routeFamilyEdges } from "./edge-routing";
import type { FamilyRelative } from "./indexing";
import type {
  ComputedRelation,
  FamilyRelationship,
  FamilyTreeSize,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
} from "./types";

export interface FamilyTreeLayoutCard<Person> {
  personId: PersonId;
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  relation: ComputedRelation;
}

export interface FamilyTreeLayoutEdge {
  id: string;
  path: string;
  kind: string;
  status?: string;
  sourceId?: PersonId;
  targetId?: PersonId;
}

export interface FamilyTreeBounds {
  width: number;
  height: number;
}

export interface FamilyTreeLayoutResult<Person> {
  cards: FamilyTreeLayoutCard<Person>[];
  edges: FamilyTreeLayoutEdge[];
  bounds: FamilyTreeBounds;
}

export interface BuildFamilyTreeLayoutInput<Person> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  measurements?: Record<PersonId, FamilyTreeSize>;
}

const defaultFallbackCardSize: FamilyTreeSize = {
  width: 220,
  height: 80,
};

const defaultSpacing: FamilyTreeSpacing = {
  row: 120,
  column: 32,
  padding: 32,
};

const round = (value: number) => Math.round(value * 100) / 100;

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
  measurements = {},
}: BuildFamilyTreeLayoutInput<Person>): FamilyTreeLayoutResult<Person> {
  const fallbackCardSize = defaultFallbackCardSize;
  const spacing = defaultSpacing;
  const index = createFamilyIndex(people, relationships);
  const neighborhood = collectFamilyNeighborhood(index, subject);
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

  let y = 0;
  const cards: FamilyTreeLayoutCard<Person>[] = [];

  for (const row of rows) {
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
    card.x = round(card.x + offsetX);
    card.y = round(card.y + offsetY);
  }

  return {
    cards,
    edges: routeFamilyEdges(cards, relationships),
    bounds: {
      width: round(maxX - minX + spacing.padding * 2),
      height: round(maxY - minY + spacing.padding * 2),
    },
  };
}
