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

const partnershipKey = (a: PersonId, b: PersonId) => [a, b].toSorted().join("|");

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

  // Track which co-parent pairs already have a horizontal bar drawn so we
  // never stack a partnership edge on top of an implicit co-parent bar.
  const drawnParentBars = new Set<string>();

  const drawParentBar = (
    pair: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>],
    id: string,
    kind: string,
    status: FamilyRelationship["status"],
  ) => {
    const [first, second] = pair;
    const y = (center(first).y + center(second).y) / 2;
    edges.push({
      id,
      path: `M ${round(first.x + first.width)} ${round(y)} L ${round(second.x)} ${round(y)}`,
      kind,
      status,
      sourceId: first.personId,
      targetId: second.personId,
    });
    drawnParentBars.add(partnershipKey(first.personId, second.personId));
    return { x: (first.x + first.width + second.x) / 2, y };
  };

  const findOrderedPair = (
    aId: PersonId,
    bId: PersonId,
  ): [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>] | null => {
    const a = cardsById.get(aId);
    const b = cardsById.get(bId);
    if (!a || !b) return null;
    return a.x <= b.x ? [a, b] : [b, a];
  };

  relationships.forEach((relationship, relationshipIndex) => {
    if (relationship.type === "partnership") {
      const [partnerAId, partnerBId] = relationship.partners;
      if (!partnerAId || !partnerBId) return;
      if (drawnParentBars.has(partnershipKey(partnerAId, partnerBId))) return;
      const pair = findOrderedPair(partnerAId, partnerBId);
      if (!pair) return;
      drawParentBar(
        pair,
        relationship.id ?? `partnership-${relationshipIndex}`,
        relationship.relation ?? "partner",
        relationship.status,
      );
      return;
    }

    if (relationship.type === "parentage") {
      // Two co-parents → always draw a horizontal parent bar between them and
      // drop one shared line to each child from the bar's midpoint.
      if (relationship.parents.length === 2) {
        const [parentAId, parentBId] = relationship.parents;
        if (parentAId && parentBId) {
          const pair = findOrderedPair(parentAId, parentBId);
          if (pair) {
            const key = partnershipKey(parentAId, parentBId);
            const join = drawnParentBars.has(key)
              ? { x: (pair[0].x + pair[0].width + pair[1].x) / 2, y: (center(pair[0]).y + center(pair[1]).y) / 2 }
              : drawParentBar(
                  pair,
                  `${relationship.id ?? `parentage-${relationshipIndex}`}-bar`,
                  relationship.relation ?? "biological",
                  relationship.status,
                );
            for (const childId of relationship.children) {
              const childCard = cardsById.get(childId);
              if (!childCard) continue;
              edges.push({
                id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${parentAId}-${parentBId}-${childId}`,
                path: createEdgePath(join, topCenter(childCard), lineShape),
                kind: relationship.relation ?? "biological",
                status: relationship.status,
                sourceId: parentAId,
                targetId: childId,
              });
            }
            return;
          }
        }
      }

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
