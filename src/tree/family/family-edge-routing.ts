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
const parentageGroupKey = (parents: PersonId[], children: PersonId[], relation: string | undefined) =>
  `${parents.toSorted().join("|")}->${children.toSorted().join("|")}:${relation ?? "biological"}`;
const slashMarkerPath = (x: number, y: number) =>
  `M ${roundTreeCoordinate(x - 5)} ${roundTreeCoordinate(y + 10)} L ${roundTreeCoordinate(x + 5)} ${roundTreeCoordinate(y - 10)}`;
const parentageJoinPoint = <Person>(pair: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>]) => {
  const [first, second] = pair;
  return {
    x: (first.x + first.width + second.x) / 2,
    clearY: Math.max(bottomCenterPoint(first).y, bottomCenterPoint(second).y),
    y: (centerPoint(first).y + centerPoint(second).y) / 2,
  };
};

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
  const drawnParentageGroups = new Set<string>();
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
    if (status === "separated" || status === "divorced") {
      const markerCount = status === "divorced" ? 2 : 1;
      const markerCenter = (first.x + first.width + second.x) / 2;
      const markerOffset = markerCount === 2 ? 5 : 0;
      for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
        const markerX = markerCenter + (markerIndex === 0 ? -markerOffset : markerOffset);
        edges.push({
          id: `${id}-${status}-marker-${markerIndex + 1}`,
          path: slashMarkerPath(markerX, y),
          kind: `${status}-marker`,
          status,
          sourceId: first.personId,
          targetId: second.personId,
        });
      }
    }
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
    const key = edge.id;
    if (drawnPersonEdges.has(key) || additionalKeys.some((additionalKey) => drawnPersonEdges.has(additionalKey))) return;
    drawnPersonEdges.add(key);
    for (const additionalKey of additionalKeys) {
      drawnPersonEdges.add(additionalKey);
    }
    edges.push(edge);
  };
  const addParentageGroupEdge = ({
    children,
    id,
    kind,
    parents,
    start,
    status,
  }: {
    children: FamilyTreeLayoutCard<Person>[];
    id: string;
    kind: string;
    parents: PersonId[];
    start: { x: number; y: number; clearY?: number };
    status: FamilyRelationship["status"];
  }) => {
    if (children.length === 0) return;
    const key = parentageGroupKey(parents, children.map((child) => child.personId), kind);
    if (drawnParentageGroups.has(key)) return;
    drawnParentageGroups.add(key);

    if (children.length === 1) {
      const child = children[0];
      if (!child) return;
      addPersonEdge({
        id,
        path: createTreeEdgePath(start, topCenterPoint(child), lineShape),
        kind,
        status,
        sourceId: parents[0],
        targetId: child.personId,
      });
      return;
    }

    const childTopPoints = children.map(topCenterPoint);
    const minChildX = Math.min(...childTopPoints.map((point) => point.x));
    const maxChildX = Math.max(...childTopPoints.map((point) => point.x));
    const minChildY = Math.min(...childTopPoints.map((point) => point.y));
    const busStartY = start.clearY ?? start.y;
    const busY = roundTreeCoordinate(busStartY + (minChildY - busStartY) * 0.5);
    const path = [
      `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} L ${roundTreeCoordinate(start.x)} ${busY}`,
      `L ${roundTreeCoordinate(minChildX)} ${busY} L ${roundTreeCoordinate(maxChildX)} ${busY}`,
      ...childTopPoints.map(
        (point) =>
          `M ${roundTreeCoordinate(point.x)} ${busY} L ${roundTreeCoordinate(point.x)} ${roundTreeCoordinate(point.y)}`,
      ),
    ].join(" ");

    edges.push({
      id,
      path,
      kind,
      status,
      sourceId: parents[0],
      targetId: children[0]?.personId,
    });
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
  });

  relationships.forEach((relationship, relationshipIndex) => {
    if (relationship.type === "partnership") return;
    if (relationship.type === "parentage") {
      if (relationship.parents.length === 2) {
        const [parentAId, parentBId] = relationship.parents;
        if (parentAId && parentBId) {
          const pair = findOrderedPair(parentAId, parentBId);
          if (pair) {
            const key = partnershipKey(parentAId, parentBId);
            if (!drawnParentBars.has(key)) {
              drawParentBar(
                pair,
                `${relationship.id ?? `parentage-${relationshipIndex}`}-bar`,
                relationship.relation ?? "biological",
                relationship.status,
              );
            }
            addParentageGroupEdge({
              children: relationship.children
                .map((childId) => cardsById.get(childId))
                .filter((childCard): childCard is FamilyTreeLayoutCard<Person> => Boolean(childCard)),
              id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${relationship.groupId ?? "ungrouped"}-${parentAId}-${parentBId}-${relationship.relation ?? "biological"}`,
              kind: relationship.relation ?? "biological",
              parents: [parentAId, parentBId],
              start: parentageJoinPoint(pair),
              status: relationship.status,
            });
            return;
          }
        }
      }

      for (const parentId of relationship.parents) {
        const parentCard = cardsById.get(parentId);
        if (!parentCard) continue;
        addParentageGroupEdge({
          children: relationship.children
            .map((childId) => cardsById.get(childId))
            .filter((childCard): childCard is FamilyTreeLayoutCard<Person> => Boolean(childCard)),
          id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${relationship.groupId ?? "ungrouped"}-${parentId}-${relationship.relation ?? "biological"}`,
          kind: relationship.relation ?? "biological",
          parents: [parentId],
          start: bottomCenterPoint(parentCard),
          status: relationship.status,
        });
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
          id: `${relationship.id ?? `guardianship-${relationshipIndex}`}-${relationship.groupId ?? "ungrouped"}-${guardianId}-${childId}-${relationship.relation ?? "guardian"}`,
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
