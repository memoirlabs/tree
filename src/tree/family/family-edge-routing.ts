import {
  bottomCenterPoint,
  centerPoint,
  roundTreeCoordinate,
  topCenterPoint,
} from "../../layout-engine";
import type { LayoutLineShape } from "../../layout-engine";
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
const rowOverlap = <Person>(a: FamilyTreeLayoutCard<Person>, b: FamilyTreeLayoutCard<Person>) =>
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > Math.min(a.height, b.height) * 0.5;
const isVisibleCard = <Person>(card: FamilyTreeLayoutCard<Person>) => !card.hiddenCard;
const hasCardBetweenPair = <Person>(
  pair: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>],
  cards: FamilyTreeLayoutCard<Person>[],
) => {
  const [first, second] = pair;
  return cards.some((card) => {
    if (!isVisibleCard(card)) return false;
    if (card.personId === first.personId || card.personId === second.personId) return false;
    if (!rowOverlap(first, card) || !rowOverlap(second, card)) return false;
    return card.x >= first.x + first.width && card.x + card.width <= second.x;
  });
};
const shouldDrawPartnershipBar = (relationship: Extract<FamilyRelationship, { type: "partnership" }>) =>
  relationship.relation !== "unknown" && relationship.status !== "unknown";
const createFamilyDescendantPath = (
  start: { x: number; y: number; clearY?: number },
  end: { x: number; y: number },
  lineShape: LayoutLineShape,
) => {
  const routeStartY = start.clearY ?? start.y;
  const midY = roundTreeCoordinate(routeStartY + (end.y - routeStartY) * 0.5);
  const startX = roundTreeCoordinate(start.x);
  const startY = roundTreeCoordinate(start.y);
  const endX = roundTreeCoordinate(end.x);
  const endY = roundTreeCoordinate(end.y);

  if (lineShape === "curved") {
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
};
const createFamilyMultiParentPath = <Person>(
  parents: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>],
  children: FamilyTreeLayoutCard<Person>[],
  cards: FamilyTreeLayoutCard<Person>[],
) => {
  const [first, second] = parents;
  const childPoints = children.map(topCenterPoint);
  const parentClearY = Math.max(bottomCenterPoint(first).y, bottomCenterPoint(second).y);
  const minChildY = Math.min(...childPoints.map((point) => point.y));
  const busY = roundTreeCoordinate(parentClearY + (minChildY - parentClearY) * 0.5);
  const parentY = roundTreeCoordinate((centerPoint(first).y + centerPoint(second).y) / 2);
  const firstRight = roundTreeCoordinate(first.x + first.width);
  const secondLeft = roundTreeCoordinate(second.x);
  const midpointX = roundTreeCoordinate((firstRight + secondLeft) / 2);
  const childXs = childPoints.map((point) => roundTreeCoordinate(point.x));
  const minBusX = Math.min(firstRight, secondLeft, midpointX, ...childXs);
  const maxBusX = Math.max(firstRight, secondLeft, midpointX, ...childXs);
  const hasInterveningCard = hasCardBetweenPair(parents, cards);
  if (!hasInterveningCard && children.length === 1) {
    const child = children[0];
    if (!child) return "";
    const childTop = topCenterPoint(child);
    return [
      `M ${firstRight} ${parentY} L ${secondLeft} ${parentY}`,
      `M ${midpointX} ${parentY} L ${midpointX} ${roundTreeCoordinate(childTop.y)}`,
    ].join(" ");
  }

  const parentConnector = hasInterveningCard
    ? [
        `M ${firstRight} ${parentY} L ${firstRight} ${busY}`,
        `M ${firstRight} ${busY} L ${secondLeft} ${busY}`,
        `M ${secondLeft} ${parentY} L ${secondLeft} ${busY}`,
      ]
    : [
        `M ${firstRight} ${parentY} L ${secondLeft} ${parentY}`,
        `M ${midpointX} ${parentY} L ${midpointX} ${busY}`,
      ];

  return [
    ...parentConnector,
    `M ${roundTreeCoordinate(minBusX)} ${busY} L ${roundTreeCoordinate(maxBusX)} ${busY}`,
    ...childPoints.map(
      (point) =>
        `M ${roundTreeCoordinate(point.x)} ${busY} L ${roundTreeCoordinate(point.x)} ${roundTreeCoordinate(point.y)}`,
    ),
  ].join(" ");
};

const connectorStartPoint = <Person>(
  parents: FamilyTreeLayoutCard<Person>[],
) => {
  if (parents.length === 2) {
    const [first, second] = parents;
    if (first && second) {
      return parentageJoinPoint(first.x <= second.x ? [first, second] : [second, first]);
    }
  }
  const parentPoints = parents.map(centerPoint);
  return {
    x: parentPoints.reduce((sum, point) => sum + point.x, 0) / Math.max(parentPoints.length, 1),
    y: parentPoints.reduce((sum, point) => sum + point.y, 0) / Math.max(parentPoints.length, 1),
  };
};

export interface RouteFamilyEdgesOptions {
  lineShape?: LayoutLineShape;
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
      sourcePort: "right",
      targetPort: "left",
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
          sourcePort: "center",
          targetPort: "center",
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
    parentCards,
    parentConnectors,
    parents,
    sourceId,
    start,
    status,
  }: {
    children: FamilyTreeLayoutCard<Person>[];
    id: string;
    kind: string;
    parentCards?: [FamilyTreeLayoutCard<Person>, FamilyTreeLayoutCard<Person>];
    parentConnectors?: FamilyTreeLayoutCard<Person>[];
    parents: PersonId[];
    sourceId?: PersonId;
    start: { x: number; y: number; clearY?: number };
    status: FamilyRelationship["status"];
  }) => {
    if (children.length === 0) return;
    const key = parentageGroupKey(parents, children.map((child) => child.personId), kind);
    if (drawnParentageGroups.has(key)) return;
    drawnParentageGroups.add(key);

    if (parentCards) {
      edges.push({
        id,
        path: createFamilyMultiParentPath(parentCards, children, cards),
        kind,
        status,
        sourceId: sourceId ?? parents[0],
        targetId: children[0]?.personId,
        sourcePort: "center",
        targetPort: "top",
      });
      return;
    }

    if (parentConnectors && parentConnectors.length > 1) {
      const connectorStart = connectorStartPoint(parentConnectors);
      if (children.length === 1) {
        const child = children[0];
        if (!child) return;
        addPersonEdge({
          id,
          path: createFamilyDescendantPath(connectorStart, topCenterPoint(child), lineShape),
          kind,
          status,
          sourceId: sourceId ?? parents[0],
          targetId: child.personId,
          sourcePort: "center",
          targetPort: "top",
        });
        return;
      }
      start = connectorStart;
    }

    if (children.length === 1) {
      const child = children[0];
      if (!child) return;
      addPersonEdge({
        id,
        path: createFamilyDescendantPath(start, topCenterPoint(child), lineShape),
        kind,
        status,
        sourceId: sourceId ?? parents[0],
        targetId: child.personId,
        sourcePort: "bottom",
        targetPort: "top",
      });
      return;
    }

    const childTopPoints = children.map(topCenterPoint);
    const minChildX = Math.min(...childTopPoints.map((point) => point.x));
    const maxChildX = Math.max(...childTopPoints.map((point) => point.x));
    const minChildY = Math.min(...childTopPoints.map((point) => point.y));
    const busStartY = start.clearY ?? start.y;
    const busY = roundTreeCoordinate(busStartY + (minChildY - busStartY) * 0.5);
    const startsFromHiddenParent = parents.length === 1 && cardsById.get(parents[0] ?? "")?.hiddenCard;
    const path = [
      startsFromHiddenParent
        ? `M ${roundTreeCoordinate(minChildX)} ${busY} L ${roundTreeCoordinate(maxChildX)} ${busY}`
        : `M ${roundTreeCoordinate(start.x)} ${roundTreeCoordinate(start.y)} L ${roundTreeCoordinate(start.x)} ${busY} L ${roundTreeCoordinate(minChildX)} ${busY} L ${roundTreeCoordinate(maxChildX)} ${busY}`,
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
      sourceId: sourceId ?? parents[0],
      targetId: children[0]?.personId,
      sourcePort: "center",
      targetPort: "top",
    });
  };

  relationships.forEach((relationship, relationshipIndex) => {
    if (relationship.type === "partnership") {
      if (!shouldDrawPartnershipBar(relationship)) return;
      const visiblePartners = relationship.partners
        .map((partnerId) => cardsById.get(partnerId))
        .filter((card): card is FamilyTreeLayoutCard<Person> => Boolean(card))
        .filter(isVisibleCard)
        .toSorted((a, b) => a.x - b.x);
      const baseId = relationship.id ?? `partnership-${relationshipIndex}`;
      for (let partnerIndex = 0; partnerIndex < visiblePartners.length - 1; partnerIndex += 1) {
        const first = visiblePartners[partnerIndex];
        const second = visiblePartners[partnerIndex + 1];
        if (!first || !second) continue;
        if (drawnParentBars.has(partnershipKey(first.personId, second.personId))) continue;
        drawParentBar(
          [first, second],
          visiblePartners.length === 2 ? baseId : `${baseId}-${partnerIndex + 1}`,
          relationship.relation ?? "partner",
          relationship.status,
        );
      }
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
            const visiblePair = pair.filter(isVisibleCard);
            addParentageGroupEdge({
              children: relationship.children
                .map((childId) => cardsById.get(childId))
                .filter((childCard): childCard is FamilyTreeLayoutCard<Person> => Boolean(childCard)),
              id: `${relationship.id ?? `parentage-${relationshipIndex}`}-${relationship.groupId ?? "ungrouped"}-${parentAId}-${parentBId}-${relationship.relation ?? "biological"}`,
              kind: relationship.relation ?? "biological",
              parentCards: visiblePair.length === 2 ? pair : undefined,
              parentConnectors: visiblePair.length === 2 ? undefined : pair,
              parents: [parentAId, parentBId],
              sourceId: relationship.groupId,
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
          sourceId: relationship.groupId,
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
          path: createFamilyDescendantPath(bottomCenterPoint(guardianCard), topCenterPoint(childCard), lineShape),
          kind: relationship.relation ?? "guardian",
          status: relationship.status,
          sourceId: guardianId,
          targetId: childId,
          sourcePort: "bottom",
          targetPort: "top",
        });
      }
    }
  });

  return edges;
}
