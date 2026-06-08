import { buildLayeredTreeLayout, roundTreeCoordinate } from "../../layout-engine";
import { routeFamilyEdges } from "./family-edge-routing";
import { normalizeFamilyInput } from "./family-graph";
import { collectFamilyNeighborhood, createFamilyIndex } from "./family-indexing";
import { createFamilyLayerBoxes, createFamilyLayoutCards } from "./family-layered-layout";
import { createFamilyLayoutLayers, createFamilyRelativeRows } from "./family-row-planning";
import type { FamilyRelative } from "./family-indexing";
import type { BuildFamilyTreeLayoutInput, FamilyTreeLayoutResult } from "./layout-types";
import type { ComputedRelation, FamilyTreeSize, FamilyTreeSpacing, PersonId } from "./types";
import type { FamilyPlacementMetadata, FamilyRelationship } from "./types";

const defaultEstimatedCardSize: FamilyTreeSize = {
  width: 220,
  height: 80,
};

const defaultSpacing: FamilyTreeSpacing = {
  row: 80,
  column: 24,
  padding: 24,
};

const centerSubjectInBounds = (
  cards: Array<{ personId: PersonId; x: number; width: number }>,
  subject: PersonId,
  padding: number,
) => {
  const subjectCard = cards.find((card) => card.personId === subject);
  if (!subjectCard || cards.length === 0) return 0;

  const subjectCenter = subjectCard.x + subjectCard.width / 2;
  const maxX = Math.max(...cards.map((card) => card.x + card.width));
  const leftPaddingNeeded = maxX + padding - subjectCenter * 2;
  if (leftPaddingNeeded <= 0) return 0;

  const shift = roundTreeCoordinate(leftPaddingNeeded);
  for (const card of cards) {
    card.x = roundTreeCoordinate(card.x + shift);
  }
  return shift;
};

const createSubjectCenteredBounds = (
  cards: Array<{ personId: PersonId; x: number; y: number; width: number; height: number }>,
  subject: PersonId,
  padding: number,
) => {
  const maxX = Math.max(...cards.map((card) => card.x + card.width));
  const maxY = Math.max(...cards.map((card) => card.y + card.height));
  const subjectCard = cards.find((card) => card.personId === subject);
  if (!subjectCard) {
    return {
      width: roundTreeCoordinate(maxX + padding),
      height: roundTreeCoordinate(maxY + padding),
    };
  }

  const subjectCenter = subjectCard.x + subjectCard.width / 2;
  return {
    width: roundTreeCoordinate(Math.max(maxX + padding, subjectCenter * 2)),
    height: roundTreeCoordinate(maxY + padding),
  };
};

const emptyPlacement = (): FamilyPlacementMetadata => ({
  partnershipGroupIds: [],
  parentChildLinkIds: [],
  guardianshipLinkIds: [],
  visibleRelationshipIds: [],
});

const addUnique = (values: string[], value: string | undefined) => {
  if (value && !values.includes(value)) values.push(value);
};

const createPlacementByPerson = (relationships: FamilyRelationship[]) => {
  const placement = new Map<PersonId, FamilyPlacementMetadata>();
  const get = (personId: PersonId) => {
    const existing = placement.get(personId);
    if (existing) return existing;
    const next = emptyPlacement();
    placement.set(personId, next);
    return next;
  };

  for (const relationship of relationships) {
    const relationshipId = relationship.id;
    if (relationship.type === "partnership") {
      for (const personId of relationship.partners) {
        const personPlacement = get(personId);
        addUnique(personPlacement.partnershipGroupIds, relationship.groupId ?? relationship.id);
        addUnique(personPlacement.visibleRelationshipIds, relationshipId);
      }
      continue;
    }

    if (relationship.type === "parentage") {
      for (const personId of [...relationship.parents, ...relationship.children]) {
        const personPlacement = get(personId);
        addUnique(personPlacement.partnershipGroupIds, relationship.groupId);
        for (const linkId of relationship.parentChildLinkIds ?? []) {
          addUnique(personPlacement.parentChildLinkIds, linkId);
        }
        addUnique(personPlacement.visibleRelationshipIds, relationshipId);
      }
      continue;
    }

    for (const personId of [...relationship.guardians, ...relationship.children]) {
      const personPlacement = get(personId);
      addUnique(personPlacement.partnershipGroupIds, relationship.groupId);
      for (const linkId of relationship.guardianshipLinkIds ?? []) {
        addUnique(personPlacement.guardianshipLinkIds, linkId);
      }
      addUnique(personPlacement.visibleRelationshipIds, relationshipId);
    }
  }

  return placement;
};

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

export function buildFamilyTreeLayout<Person>({
  subject,
  people,
  relationships,
  graph,
  collapsed = [],
  measurements = {},
  spacing: spacingOverrides,
  limits,
  lineShape = "orthogonal",
}: BuildFamilyTreeLayoutInput<Person>): FamilyTreeLayoutResult<Person> {
  const normalized = normalizeFamilyInput({ graph, people, relationships, subject });
  subject = normalized.subject;
  people = normalized.people;
  relationships = normalized.relationships;
  const estimatedCardSize = defaultEstimatedCardSize;
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

  const rows = createFamilyRelativeRows(neighborhood);

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

  const placementByPerson = createPlacementByPerson(neighborhood.relationships);
  const personGap = Math.min(spacing.column, 24);
  const layers = createFamilyLayoutLayers(neighborhood, visibleRows);
  const layeredLayout = buildLayeredTreeLayout({
    layers: createFamilyLayerBoxes(layers, measurements, estimatedCardSize, personGap),
    spacing,
  });
  const cards = createFamilyLayoutCards(layeredLayout.boxes, measurements, estimatedCardSize, personGap);

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
  const offsetX = spacing.padding - minX;
  const offsetY = spacing.padding - minY;

  for (const card of cards) {
    card.x = roundTreeCoordinate(card.x + offsetX);
    card.y = roundTreeCoordinate(card.y + offsetY);
    card.placement = placementByPerson.get(card.personId) ?? emptyPlacement();
  }
  centerSubjectInBounds(cards, subject, spacing.padding);

  return {
    cards,
    edges: routeFamilyEdges(cards, relationships, { lineShape }),
    bounds: createSubjectCenteredBounds(cards, subject, spacing.padding),
  };
}
