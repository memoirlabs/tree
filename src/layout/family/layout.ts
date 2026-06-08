import { roundTreeCoordinate } from "../../layout-engine";
import { buildFamilyLayoutGraph } from "./graph";
import { normalizeFamilyLayoutInput } from "./normalize";
import { buildFamilyLayoutPlan } from "./plan";
import type {
  FamilyLayoutBounds,
  FamilyLayoutEdge,
  FamilyLayoutInput,
  FamilyLayoutNode,
  FamilyLayoutOptions,
  FamilyLayoutPoint,
  FamilyLayoutResult,
  FamilyNodeId,
  FamilyPersonLayoutNode,
  FamilyUnionLayoutNode,
} from "./types";
import { resolveFamilyLayoutOptions } from "./types";
import type { FamilyLayoutPlan, FamilyLayoutPlanNode } from "./plan";

type PlacedNode<Person> = FamilyLayoutNode<Person>;

const centerX = (node: { x: number; width: number }) => node.x + node.width / 2;
const centerY = (node: { y: number; height: number }) => node.y + node.height / 2;

const stableOrder = (a: { id: string; order: number }, b: { id: string; order: number }) =>
  a.order - b.order || a.id.localeCompare(b.id);

function initialPlace<Person>(
  plan: FamilyLayoutPlan<Person>,
  options: FamilyLayoutOptions,
): PlacedNode<Person>[] {
  const nodes: PlacedNode<Person>[] = [];
  const planNodesById = new Map<FamilyNodeId, FamilyLayoutPlanNode<Person>>(
    plan.nodes.map((node) => [node.id, node]),
  );

  for (const layer of plan.layers) {
    let cursor = 0;
    for (const id of layer.nodeIds) {
      const planNode = planNodesById.get(id);
      if (!planNode) continue;
      if (planNode.kind === "person") {
        const width = planNode.hidden ? 0 : options.personSize.width;
        const height = planNode.hidden ? 0 : options.personSize.height;
        nodes.push({
          kind: "person",
          id,
          data: planNode.data,
          x: cursor,
          y: layer.rank * options.spacing.rank,
          width,
          height,
          rank: layer.rank,
          order: planNode.order,
          unions: planNode.unions,
          parentUnions: planNode.parentUnions,
          childUnions: planNode.childUnions,
          synthetic: planNode.synthetic,
          hidden: planNode.hidden,
        });
        cursor += width + options.spacing.person;
        continue;
      }

      nodes.push({
        kind: "union",
        id,
        x: cursor,
        y: layer.rank * options.spacing.rank,
        width: options.unionSize.width,
        height: options.unionSize.height,
        rank: layer.rank,
        order: planNode.order,
        partners: planNode.partners,
        children: planNode.children,
        kindLabel: planNode.kindLabel,
        status: planNode.status,
        synthetic: planNode.synthetic,
        hidden: planNode.hidden,
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
  plan: FamilyLayoutPlan<Person>,
  nodes: PlacedNode<Person>[],
): FamilyLayoutEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: FamilyLayoutEdge[] = [];

  for (const edge of plan.edges) {
    const fromNode = byId.get(edge.from);
    const toNode = byId.get(edge.to);
    if (!fromNode || !toNode) continue;

    if (edge.kind === "partner-union") {
      const partner = fromNode;
      const unionNode = toNode;
      const points = [
        { x: centerX(partner), y: partner.y + partner.height },
        { x: centerX(partner), y: centerY(unionNode) },
        { x: centerX(unionNode), y: centerY(unionNode) },
      ];
      edges.push({
        ...edge,
        points,
        path: pointsToPath(points),
      });
      continue;
    }

    const unionNode = fromNode;
    const child = toNode;
    if (!unionNode) continue;
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
      ...edge,
      points,
      path: pointsToPath(points),
    });
  }

  return edges;
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
  const plan = buildFamilyLayoutPlan(graph, center);
  const nodes = initialPlace(plan, options);
  optimizeNodePositions(nodes, options);
  normalizeCoordinates(nodes, center, options);
  const edges = routeEdges(plan, nodes);
  const people = nodes.filter((node): node is FamilyPersonLayoutNode<Person> => node.kind === "person");
  const unions = nodes.filter((node): node is FamilyUnionLayoutNode => node.kind === "union");

  return {
    nodes,
    people,
    unions,
    edges,
    bounds: computeBounds(nodes),
    warnings: [...graph.warnings, ...plan.warnings],
  };
}
