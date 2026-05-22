import {
  bottomCenterPoint,
  centerPoint,
  createTreeEdgePath,
  roundTreeCoordinate,
  topCenterPoint,
} from "../core";
import type { TreeLineShape } from "../core";
import type { FamilyRelationship, PersonId } from "./types";
import type { FamilyTreeLayoutCard, FamilyTreeLayoutEdge } from "./layout-types";

const cardById = <Person>(cards: FamilyTreeLayoutCard<Person>[]) =>
  new Map<PersonId, FamilyTreeLayoutCard<Person>>(cards.map((card) => [card.personId, card]));

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
  const drawnParentBars = new Set<string>();
  const drawnPersonEdges = new Set<string>();

  const drawParentBar = (
    pair: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>],
    id: string,
    kind: string,
    status: FamilyRelationship["status"],
  ) => {
    const [first, second] = pair;
    const y = (centerPoint(first).y + centerPoint(second).y) / 2;
    edges.push({
      id,
      path: `M ${roundTreeCoordinate(first.x + first.width)} ${roundTreeCoordinate(y)} L ${roundTreeCoordinate(second.x)} ${roundTreeCoordinate(y)}`,
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
  const addPersonEdge = (edge: FamilyTreeLayoutEdge, additionalKeys: string[] = []) => {
    const key = `${edge.sourceId ?? ""}->${edge.targetId ?? ""}`;
    if (drawnPersonEdges.has(key) || additionalKeys.some((additionalKey) => drawnPersonEdges.has(additionalKey))) return;
    drawnPersonEdges.add(key);
    for (const additionalKey of additionalKeys) {
      drawnPersonEdges.add(additionalKey);
    }
    edges.push(edge);
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
      if (relationship.parents.length === 2) {
        const [parentAId, parentBId] = relationship.parents;
        if (parentAId && parentBId) {
          const pair = findOrderedPair(parentAId, parentBId);
          if (pair) {
            const key = partnershipKey(parentAId, parentBId);
            const join = drawnParentBars.has(key)
              ? { x: (pair[0].x + pair[0].width + pair[1].x) / 2, y: (centerPoint(pair[0]).y + centerPoint(pair[1]).y) / 2 }
              : drawParentBar(
                  pair,
                  `${relationship.id ?? `parentage-${relationshipIndex}`}-bar`,
                  relationship.relation ?? "biological",
                  relationship.status,
                );
            for (const childId of relationship.children) {
              const childCard = cardsById.get(childId);
              if (!childCard) continue;
              addPersonEdge(
                {
                  id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${parentAId}-${parentBId}-${childId}`,
                  path: createTreeEdgePath(join, topCenterPoint(childCard), lineShape),
                  kind: relationship.relation ?? "biological",
                  status: relationship.status,
                  sourceId: parentAId,
                  targetId: childId,
                },
                [`${parentBId}->${childId}`],
              );
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
          addPersonEdge({
            id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${parentId}-${childId}`,
            path: createTreeEdgePath(bottomCenterPoint(parentCard), topCenterPoint(childCard), lineShape),
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
        addPersonEdge({
          id: `${relationship.id ?? `guardianship-${relationshipIndex}`}-${guardianId}-${childId}`,
          path: createTreeEdgePath(bottomCenterPoint(guardianCard), topCenterPoint(childCard), lineShape),
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
