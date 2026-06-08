import { roundTreeCoordinate } from "../../layout-engine";
import { buildFamilyLayoutGraph } from "./graph";
import { normalizeFamilyLayoutInput } from "./normalize";
import { assignFamilyRanks } from "./rank";
import type {
  FamilyLayoutBounds,
  FamilyLayoutEdge,
  FamilyLayoutInput,
  FamilyLayoutNode,
  FamilyLayoutOptions,
  FamilyLayoutPoint,
  FamilyLayoutResult,
  FamilyNodeId,
  FamilyParentLinkKind,
  FamilyPersonLayoutNode,
  FamilyUnionLayoutNode,
  PersonId,
} from "./types";
import { resolveFamilyLayoutOptions } from "./types";
import type { InternalFamilyGraph } from "./graph";

type PlacedNode<Person> = FamilyLayoutNode<Person>;

const centerX = (node: { x: number; width: number }) => node.x + node.width / 2;
const centerY = (node: { y: number; height: number }) => node.y + node.height / 2;

const stableOrder = (a: { id: string; order: number }, b: { id: string; order: number }) =>
  a.order - b.order || a.id.localeCompare(b.id);

function orderForNode<Person>(graph: InternalFamilyGraph<Person>, id: FamilyNodeId): number {
  const union = graph.unions.get(id);
  if (union) return union.order;

  const parentUnionOrders = (graph.unionsByChild.get(id) ?? [])
    .map((unionId) => graph.unions.get(unionId)?.order)
    .filter((order): order is number => order !== undefined);
  if (parentUnionOrders.length > 0) return Math.min(...parentUnionOrders);

  const childUnionOrders = (graph.unionsByPartner.get(id) ?? [])
    .map((unionId) => graph.unions.get(unionId)?.order)
    .filter((order): order is number => order !== undefined);
  if (childUnionOrders.length > 0) return Math.min(...childUnionOrders);

  return Number.POSITIVE_INFINITY;
}

function buildRankLayers<Person>(
  graph: InternalFamilyGraph<Person>,
  ranks: Map<FamilyNodeId, number>,
): Map<number, FamilyNodeId[]> {
  const layers = new Map<number, FamilyNodeId[]>();
  const add = (rank: number, id: FamilyNodeId) => {
    const existing = layers.get(rank);
    if (existing) {
      existing.push(id);
    } else {
      layers.set(rank, [id]);
    }
  };

  for (const personId of graph.people.keys()) add(ranks.get(personId) ?? 0, personId);
  for (const unionId of graph.unions.keys()) add(ranks.get(unionId) ?? 0, unionId);

  for (const [rank, ids] of layers) {
    layers.set(
      rank,
      ids.toSorted((a, b) => {
        return orderForNode(graph, a) - orderForNode(graph, b) || a.localeCompare(b);
      }),
    );
  }

  return layers;
}

function initialPlace<Person>(
  graph: InternalFamilyGraph<Person>,
  ranks: Map<FamilyNodeId, number>,
  options: FamilyLayoutOptions,
): PlacedNode<Person>[] {
  const layers = buildRankLayers(graph, ranks);
  const nodes: PlacedNode<Person>[] = [];

  for (const rank of Array.from(layers.keys()).toSorted((a, b) => a - b)) {
    const ids = layers.get(rank) ?? [];
    let cursor = 0;
    for (const id of ids) {
      const person = graph.people.get(id);
      if (person) {
        nodes.push({
          kind: "person",
          id,
          data: person.data,
          x: cursor,
          y: rank * options.spacing.rank,
          width: options.personSize.width,
          height: options.personSize.height,
          rank,
          order: orderForNode(graph, id),
          unions: [
            ...new Set([...(graph.unionsByPartner.get(id) ?? []), ...(graph.unionsByChild.get(id) ?? [])]),
          ],
          parentUnions: graph.unionsByChild.get(id) ?? [],
          childUnions: graph.unionsByPartner.get(id) ?? [],
          synthetic: person.synthetic || undefined,
        });
        cursor += options.personSize.width + options.spacing.person;
        continue;
      }

      const union = graph.unions.get(id);
      if (!union) continue;
      nodes.push({
        kind: "union",
        id,
        x: cursor,
        y: rank * options.spacing.rank,
        width: options.unionSize.width,
        height: options.unionSize.height,
        rank,
        order: union.order,
        partners: union.partners,
        children: union.children,
        kindLabel: union.kind,
        status: union.status,
        synthetic: union.synthetic || undefined,
        hidden: true,
      });
      cursor += options.unionSize.width + options.spacing.union;
    }
  }

  return nodes;
}

function optimizeNodePositions<Person>(
  nodes: PlacedNode<Person>[],
  options: FamilyLayoutOptions,
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (let pass = 0; pass < 20; pass += 1) {
    const desired = new Map<FamilyNodeId, number>();
    for (const node of nodes) desired.set(node.id, node.x);

    for (const node of nodes) {
      if (node.kind !== "union") continue;
      const partnerCenters = node.partners
        .map((partner) => byId.get(partner))
        .filter((partner): partner is PlacedNode<Person> => Boolean(partner))
        .map(centerX);
      const childCenters = node.children
        .map((child) => byId.get(child))
        .filter((child): child is PlacedNode<Person> => Boolean(child))
        .map(centerX);
      const targets: Array<{ value: number; weight: number }> = [];
      if (partnerCenters.length > 0) targets.push({ value: average(partnerCenters), weight: 3 });
      if (childCenters.length > 0) targets.push({ value: median(childCenters), weight: 2 });
      if (targets.length === 0) continue;
      desired.set(node.id, weightedAverage(targets) - node.width / 2);
    }

    for (const node of nodes) {
      if (node.kind !== "person") continue;
      const parentUnionCenters = node.parentUnions
        .map((unionId) => byId.get(unionId))
        .filter((union): union is PlacedNode<Person> => Boolean(union))
        .map(centerX);
      const childUnionCenters = node.childUnions
        .map((unionId) => byId.get(unionId))
        .filter((union): union is PlacedNode<Person> => Boolean(union))
        .map(centerX);
      const targets: Array<{ value: number; weight: number }> = [];
      if (parentUnionCenters.length > 0) targets.push({ value: average(parentUnionCenters), weight: 1.4 });
      if (childUnionCenters.length > 0) targets.push({ value: average(childUnionCenters), weight: 0.4 });
      if (targets.length === 0) continue;
      const target = weightedAverage(targets) - node.width / 2;
      desired.set(node.id, node.x + (target - node.x) * 0.18);
    }

    for (const node of nodes) {
      node.x = desired.get(node.id) ?? node.x;
    }
    resolveRankOverlaps(nodes, options);
  }
}

function resolveRankOverlaps<Person>(nodes: PlacedNode<Person>[], options: FamilyLayoutOptions): void {
  const ranks = new Map<number, PlacedNode<Person>[]>();
  for (const node of nodes) {
    const rankNodes = ranks.get(node.rank);
    if (rankNodes) {
      rankNodes.push(node);
    } else {
      ranks.set(node.rank, [node]);
    }
  }

  for (const rankNodes of ranks.values()) {
    rankNodes.sort(stableOrder);
    const desiredCenter = average(rankNodes.map(centerX));
    let cursor = Number.NEGATIVE_INFINITY;
    for (const node of rankNodes) {
      const gap = node.kind === "union" ? options.spacing.union : options.spacing.person;
      if (cursor === Number.NEGATIVE_INFINITY) {
        cursor = node.x + node.width;
        continue;
      }
      const minX = cursor + gap;
      if (node.x < minX) node.x = minX;
      cursor = node.x + node.width;
    }
    const actualCenter = average(rankNodes.map(centerX));
    const shift = desiredCenter - actualCenter;
    for (const node of rankNodes) node.x += shift;
  }
}

function normalizeCoordinates<Person>(
  nodes: PlacedNode<Person>[],
  center: FamilyNodeId | undefined,
  options: FamilyLayoutOptions,
): void {
  const centerNode = center ? nodes.find((node) => node.id === center) : undefined;
  const centerShift = centerNode ? -centerX(centerNode) : 0;
  for (const node of nodes) node.x += centerShift;

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const offsetX = options.spacing.padding - minX;
  const offsetY = options.spacing.padding - minY;
  for (const node of nodes) {
    node.x = roundTreeCoordinate(node.x + offsetX);
    node.y = roundTreeCoordinate(node.y + offsetY);
  }
}

function routeEdges<Person>(
  graph: InternalFamilyGraph<Person>,
  nodes: PlacedNode<Person>[],
): FamilyLayoutEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: FamilyLayoutEdge[] = [];

  for (const union of graph.unions.values()) {
    const unionNode = byId.get(union.id);
    if (!unionNode) continue;

    for (const partnerId of union.partners) {
      const partner = byId.get(partnerId);
      if (!partner) continue;
      const points = [
        { x: centerX(partner), y: partner.y + partner.height },
        { x: centerX(partner), y: centerY(unionNode) },
        { x: centerX(unionNode), y: centerY(unionNode) },
      ];
      edges.push({
        id: `partner-union:${partnerId}:${union.id}`,
        kind: "partner-union",
        from: partnerId,
        to: union.id,
        points,
        path: pointsToPath(points),
        status: union.status,
        synthetic: union.synthetic || undefined,
      });
    }

    for (const childId of union.children) {
      const child = byId.get(childId);
      if (!child) continue;
      const relation = relationForUnionChild(graph.parentLinksByUnion.get(union.id) ?? [], childId);
      const startY = unionNode.y + unionNode.height;
      const endY = child.y;
      const midY = roundTreeCoordinate(startY + (endY - startY) / 2);
      const points = [
        { x: centerX(unionNode), y: startY },
        { x: centerX(unionNode), y: midY },
        { x: centerX(child), y: midY },
        { x: centerX(child), y: endY },
      ];
      edges.push({
        id: `union-child:${union.id}:${childId}`,
        kind: "union-child",
        from: union.id,
        to: childId,
        points,
        path: pointsToPath(points),
        relation,
        status: union.status,
        synthetic: union.synthetic || undefined,
      });
    }
  }

  return edges;
}

function relationForUnionChild(links: Array<{ child: PersonId; kind?: FamilyParentLinkKind }>, childId: PersonId) {
  const kinds = new Set(
    links.filter((link) => link.child === childId).map((link) => link.kind ?? "unknown"),
  );
  if (kinds.size === 0) return undefined;
  if (kinds.size === 1) return Array.from(kinds)[0];
  return "mixed";
}

function pointsToPath(points: FamilyLayoutPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${roundTreeCoordinate(point.x)} ${roundTreeCoordinate(point.y)}`)
    .join(" ");
}

function computeBounds<Person>(nodes: PlacedNode<Person>[]): FamilyLayoutBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    minX: roundTreeCoordinate(minX),
    minY: roundTreeCoordinate(minY),
    maxX: roundTreeCoordinate(maxX),
    maxY: roundTreeCoordinate(maxY),
    width: roundTreeCoordinate(maxX - minX),
    height: roundTreeCoordinate(maxY - minY),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  const value = sorted[midpoint];
  if (value === undefined) return 0;
  if (sorted.length % 2 === 1) return value;
  return ((sorted[midpoint - 1] ?? value) + value) / 2;
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export function layoutFamilyTree<Person>(input: FamilyLayoutInput<Person>): FamilyLayoutResult<Person> {
  const options = resolveFamilyLayoutOptions(input.options);
  const normalized = normalizeFamilyLayoutInput(input, options);
  const graph = buildFamilyLayoutGraph(normalized);
  const center = input.center ?? input.root ?? normalized.center ?? normalized.root;
  const rankResult = assignFamilyRanks(graph, center);
  const nodes = initialPlace(graph, rankResult.ranks, options);
  optimizeNodePositions(nodes, options);
  normalizeCoordinates(nodes, center, options);
  const edges = routeEdges(graph, nodes);
  const people = nodes.filter((node): node is FamilyPersonLayoutNode<Person> => node.kind === "person");
  const unions = nodes.filter((node): node is FamilyUnionLayoutNode => node.kind === "union");

  return {
    nodes,
    people,
    unions,
    edges,
    bounds: computeBounds(nodes),
    warnings: [...graph.warnings, ...rankResult.warnings],
  };
}
