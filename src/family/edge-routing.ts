import type { FamilyRelationship, PersonId } from "./types";
import type { FamilyTreeLayoutCard, FamilyTreeLayoutEdge } from "./layout";
import type { TreeLineShape } from "./theme";

const round = (value: number) => Math.round(value * 100) / 100;

const center = (card: FamilyTreeLayoutCard<unknown>) => ({
  x: card.x + card.width / 2,
  y: card.y + card.height / 2,
});

const topCenter = (card: FamilyTreeLayoutCard<unknown>) => ({
  x: card.x + card.width / 2,
  y: card.y,
});

const bottomCenter = (card: FamilyTreeLayoutCard<unknown>) => ({
  x: card.x + card.width / 2,
  y: card.y + card.height,
});

const cardById = <Person>(cards: FamilyTreeLayoutCard<Person>[]) =>
  new Map<PersonId, FamilyTreeLayoutCard<Person>>(cards.map((card) => [card.personId, card]));

const createOrthogonalPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const midY = round((start.y + end.y) / 2);
  return `M ${round(start.x)} ${round(start.y)} L ${round(start.x)} ${midY} L ${round(end.x)} ${midY} L ${round(end.x)} ${round(end.y)}`;
};

const createCurvedPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const midY = round((start.y + end.y) / 2);
  return `M ${round(start.x)} ${round(start.y)} C ${round(start.x)} ${midY}, ${round(end.x)} ${midY}, ${round(end.x)} ${round(end.y)}`;
};

const createEdgePath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  lineShape: TreeLineShape,
) => (lineShape === "curved" ? createCurvedPath(start, end) : createOrthogonalPath(start, end));

export interface RouteFamilyEdgesOptions {
  lineShape?: TreeLineShape;
}

export function routeFamilyEdges<Person>(
  cards: FamilyTreeLayoutCard<Person>[],
  relationships: FamilyRelationship[],
  options: RouteFamilyEdgesOptions = {},
): FamilyTreeLayoutEdge[] {
  const cardsById = cardById(cards);
  const edges: FamilyTreeLayoutEdge[] = [];
  const lineShape = options.lineShape ?? "orthogonal";

  relationships.forEach((relationship, relationshipIndex) => {
    if (relationship.type === "partnership") {
      const visiblePartners = relationship.partners
        .map((partnerId) => cardsById.get(partnerId))
        .filter((card): card is FamilyTreeLayoutCard<Person> => Boolean(card));
      if (visiblePartners.length < 2) return;
      const [first, second] = visiblePartners.toSorted((a, b) => a.x - b.x);
      if (!first || !second) return;
      const firstCenter = center(first);
      const secondCenter = center(second);
      edges.push({
        id: relationship.id ?? `partnership-${relationshipIndex}`,
        path: `M ${round(first.x + first.width)} ${round(firstCenter.y)} L ${round(second.x)} ${round(secondCenter.y)}`,
        kind: relationship.relation ?? "partner",
        status: relationship.status,
        sourceId: first.personId,
        targetId: second.personId,
      });
      return;
    }

    if (relationship.type === "parentage") {
      for (const parentId of relationship.parents) {
        const parentCard = cardsById.get(parentId);
        if (!parentCard) continue;
        for (const childId of relationship.children) {
          const childCard = cardsById.get(childId);
          if (!childCard) continue;
          edges.push({
            id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${parentId}-${childId}`,
            path: createEdgePath(bottomCenter(parentCard), topCenter(childCard), lineShape),
            kind: relationship.relation ?? "biological",
            status: relationship.status,
            sourceId: parentId,
            targetId: childId,
          });
        }
      }
      return;
    }

    for (const guardianId of relationship.guardians) {
      const guardianCard = cardsById.get(guardianId);
      if (!guardianCard) continue;
      for (const childId of relationship.children) {
        const childCard = cardsById.get(childId);
        if (!childCard) continue;
        edges.push({
          id: `${relationship.id ?? `guardianship-${relationshipIndex}`}-${guardianId}-${childId}`,
          path: createEdgePath(bottomCenter(guardianCard), topCenter(childCard), lineShape),
          kind: relationship.relation ?? "guardian",
          status: relationship.status,
          sourceId: guardianId,
          targetId: childId,
        });
      }
    }
  });

  return edges;
}
