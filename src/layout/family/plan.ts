import type { InternalFamilyGraph } from "./graph";
import { assignFamilyRanks } from "./rank";
import type {
  FamilyLayoutWarning,
  FamilyNodeId,
  FamilyParentLinkKind,
  FamilyUnionKind,
  FamilyUnionStatus,
  PersonId,
  UnionId,
} from "./types";

export interface FamilyPersonPlanNode<Person = unknown> {
  kind: "person";
  id: PersonId;
  data: Person;
  rank: number;
  order: number;
  unions: UnionId[];
  parentUnions: UnionId[];
  childUnions: UnionId[];
  synthetic?: boolean;
  hidden?: boolean;
}

export interface FamilyUnionPlanNode {
  kind: "union";
  id: UnionId;
  rank: number;
  order: number;
  partners: PersonId[];
  children: PersonId[];
  kindLabel?: FamilyUnionKind;
  status?: FamilyUnionStatus;
  synthetic?: boolean;
  hidden: boolean;
}

export type FamilyLayoutPlanNode<Person = unknown> = FamilyPersonPlanNode<Person> | FamilyUnionPlanNode;

export interface FamilyLayoutPlanLayer {
  rank: number;
  nodeIds: FamilyNodeId[];
}

export interface FamilyLayoutPlanEdge {
  id: string;
  kind: "partner-union" | "union-child";
  from: FamilyNodeId;
  to: FamilyNodeId;
  relation?: FamilyParentLinkKind | "mixed";
  status?: FamilyUnionStatus;
  synthetic?: boolean;
}

export interface FamilyLayoutPlan<Person = unknown> {
  center?: FamilyNodeId;
  nodes: FamilyLayoutPlanNode<Person>[];
  layers: FamilyLayoutPlanLayer[];
  edges: FamilyLayoutPlanEdge[];
  warnings: FamilyLayoutWarning[];
}

export function orderForFamilyNode<Person>(graph: InternalFamilyGraph<Person>, id: FamilyNodeId): number {
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

export function buildFamilyLayoutPlan<Person>(
  graph: InternalFamilyGraph<Person>,
  requestedCenter?: FamilyNodeId,
): FamilyLayoutPlan<Person> {
  const rankResult = assignFamilyRanks(graph, requestedCenter);
  const center = requestedCenter && (graph.people.has(requestedCenter) || graph.unions.has(requestedCenter))
    ? requestedCenter
    : undefined;
  const nodes: FamilyLayoutPlanNode<Person>[] = [];
  const layerMap = new Map<number, FamilyNodeId[]>();

  const addToLayer = (rank: number, id: FamilyNodeId) => {
    const existing = layerMap.get(rank);
    if (existing) {
      existing.push(id);
    } else {
      layerMap.set(rank, [id]);
    }
  };

  for (const [id, person] of graph.people) {
    const rank = rankResult.ranks.get(id) ?? 0;
    addToLayer(rank, id);
    nodes.push({
      kind: "person",
      id,
      data: person.data,
      rank,
      order: orderForFamilyNode(graph, id),
      unions: [
        ...new Set([...(graph.unionsByPartner.get(id) ?? []), ...(graph.unionsByChild.get(id) ?? [])]),
      ],
      parentUnions: graph.unionsByChild.get(id) ?? [],
      childUnions: graph.unionsByPartner.get(id) ?? [],
      synthetic: person.synthetic || undefined,
      hidden: person.hidden || undefined,
    });
  }

  for (const [id, union] of graph.unions) {
    const rank = rankResult.ranks.get(id) ?? 0;
    addToLayer(rank, id);
    nodes.push({
      kind: "union",
      id,
      rank,
      order: union.order,
      partners: union.partners,
      children: union.children,
      kindLabel: union.kind,
      status: union.status,
      synthetic: union.synthetic || undefined,
      hidden: true,
    });
  }

  const layers = Array.from(layerMap.entries())
    .toSorted(([a], [b]) => a - b)
    .map(([rank, nodeIds]) => ({
      rank,
      nodeIds: nodeIds.toSorted(
        (a, b) => orderForFamilyNode(graph, a) - orderForFamilyNode(graph, b) || a.localeCompare(b),
      ),
    }));

  const edges: FamilyLayoutPlanEdge[] = [];
  for (const union of graph.unions.values()) {
    for (const partnerId of union.partners) {
      edges.push({
        id: `partner-union:${partnerId}:${union.id}`,
        kind: "partner-union",
        from: partnerId,
        to: union.id,
        status: union.status,
        synthetic: union.synthetic || undefined,
      });
    }

    for (const childId of union.children) {
      edges.push({
        id: `union-child:${union.id}:${childId}`,
        kind: "union-child",
        from: union.id,
        to: childId,
        relation: relationForUnionChild(graph.parentLinksByUnion.get(union.id) ?? [], childId),
        status: union.status,
        synthetic: union.synthetic || undefined,
      });
    }
  }

  return {
    center,
    nodes,
    layers,
    edges,
    warnings: rankResult.warnings,
  };
}

function relationForUnionChild(
  links: Array<{ child: PersonId; kind?: FamilyParentLinkKind }>,
  childId: PersonId,
) {
  const kinds = new Set(
    links.filter((link) => link.child === childId).map((link) => link.kind ?? "unknown"),
  );
  if (kinds.size === 0) return undefined;
  if (kinds.size === 1) return Array.from(kinds)[0];
  return "mixed";
}
