import type { RelationType } from "./types";
import type { RelationshipEdge, RelationshipNode } from "./relationships";

export type RelationshipGraphDomain = "family" | "org" | "mixed";
export type RelationshipLinePattern = "solid" | "dashed";
export type RelationshipLinePlacement = "vertical" | "horizontal" | "same-row" | "side";

export interface RelationshipTableRow<TNode = unknown, TEdge = unknown> {
  id?: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  sourceLabel?: string;
  targetLabel?: string;
  sourceData?: TNode;
  targetData?: TNode;
  edgeData?: TEdge;
  label?: string;
  status?: RelationshipEdge["status"];
  order?: number;
  sourceOrder?: number;
  targetOrder?: number;
}

export interface RelationshipGraphFromRowsResult {
  nodes: RelationshipNode[];
  relationships: RelationshipEdge[];
  inferredRootId?: string;
  inferredDomain: RelationshipGraphDomain;
}

export interface RelationshipDisplaySemantics {
  domain: RelationshipGraphDomain;
  pattern: RelationshipLinePattern;
  placement: RelationshipLinePlacement;
  directional: boolean;
  description: string;
}

const familyRelationTypes = new Set<RelationType>([
  "parent",
  "child",
  "sibling",
  "spouse",
  "former_spouse",
  "grandparent",
  "grandchild",
]);

const orgRelationTypes = new Set<RelationType>(["manager", "direct_report", "peer", "ceo", "assistant"]);
const parentLikeTypes = new Set<RelationType>(["parent", "grandparent"]);
const childLikeTypes = new Set<RelationType>(["child", "grandchild"]);

const compareDisplayNodes = (a: RelationshipNode, b: RelationshipNode): number =>
  (a.displayOrder ?? Number.POSITIVE_INFINITY) - (b.displayOrder ?? Number.POSITIVE_INFINITY) ||
  a.label.localeCompare(b.label) ||
  a.id.localeCompare(b.id);

const addOrUpdateNode = (
  nodesById: Map<string, RelationshipNode>,
  id: string,
  label: string | undefined,
  data: unknown,
  displayOrder: number | undefined,
) => {
  const existing = nodesById.get(id);
  if (existing) {
    if (!existing.label && label) existing.label = label;
    if (existing.data === undefined && data !== undefined) existing.data = data;
    if (existing.displayOrder === undefined && displayOrder !== undefined) existing.displayOrder = displayOrder;
    return;
  }
  nodesById.set(id, {
    id,
    label: label ?? id,
    data,
    displayOrder,
  });
};

const normalizeDirectionalRow = (row: RelationshipTableRow, index: number) => {
  if (childLikeTypes.has(row.type) || row.type === "direct_report") {
    return {
      sourceId: row.targetId,
      targetId: row.sourceId,
      sourceLabel: row.targetLabel,
      targetLabel: row.sourceLabel,
      sourceData: row.targetData,
      targetData: row.sourceData,
      sourceOrder: row.targetOrder,
      targetOrder: row.sourceOrder,
      type: row.type === "child" ? "parent" : row.type === "grandchild" ? "grandparent" : "manager",
      id: row.id,
      label: row.label,
      status: row.status,
      edgeData: row.edgeData,
      order: row.order ?? index,
    } satisfies RelationshipTableRow;
  }
  return {
    ...row,
    order: row.order ?? index,
  };
};

const inferDomain = (relationships: RelationshipEdge[]): RelationshipGraphDomain => {
  const hasFamily = relationships.some((relationship) => familyRelationTypes.has(relationship.type));
  const hasOrg = relationships.some((relationship) => orgRelationTypes.has(relationship.type));
  if (hasFamily && hasOrg) return "mixed";
  if (hasOrg) return "org";
  return "family";
};

export function inferRelationshipChartMode(relationships: RelationshipEdge[]): "family" | "org" | "all" {
  const domain = inferDomain(relationships);
  if (domain === "family") return "family";
  if (domain === "org") return "org";
  return "all";
}

export function inferRelationshipRootId(
  nodes: RelationshipNode[],
  relationships: RelationshipEdge[],
  preferredDomain: RelationshipGraphDomain = inferDomain(relationships),
): string | undefined {
  if (nodes.length === 0) return undefined;

  if (preferredDomain === "org") {
    const incomingManagementTargets = new Set(
      relationships
        .filter((relationship) => relationship.type === "manager" || relationship.type === "ceo")
        .map((relationship) => relationship.targetId),
    );
    const topOrgNode = nodes
      .filter((node) => !incomingManagementTargets.has(node.id))
      .toSorted(compareDisplayNodes)
      .find((node) =>
        relationships.some(
          (relationship) =>
            relationship.sourceId === node.id && (relationship.type === "manager" || relationship.type === "ceo"),
        ),
      );
    if (topOrgNode) return topOrgNode.id;
  }

  const scores = new Map<string, number>();
  for (const node of nodes) scores.set(node.id, 0);
  for (const relationship of relationships) {
    const sourceScore = scores.get(relationship.sourceId) ?? 0;
    const targetScore = scores.get(relationship.targetId) ?? 0;
    const directionalWeight = parentLikeTypes.has(relationship.type) || relationship.type === "manager" ? 2 : 1;
    scores.set(relationship.sourceId, sourceScore + directionalWeight);
    scores.set(relationship.targetId, targetScore + 1);
  }

  return nodes.toSorted(compareDisplayNodes).toSorted((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))[0]?.id;
}

export function buildRelationshipGraphFromRows(rows: RelationshipTableRow[]): RelationshipGraphFromRowsResult {
  const nodesById = new Map<string, RelationshipNode>();
  const relationships: RelationshipEdge[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeDirectionalRow(row, index);
    addOrUpdateNode(nodesById, normalized.sourceId, normalized.sourceLabel, normalized.sourceData, normalized.sourceOrder);
    addOrUpdateNode(nodesById, normalized.targetId, normalized.targetLabel, normalized.targetData, normalized.targetOrder);
    relationships.push({
      id: normalized.id ?? `${normalized.sourceId}:${normalized.type}:${normalized.targetId}:${index}`,
      sourceId: normalized.sourceId,
      targetId: normalized.targetId,
      type: normalized.type,
      label: normalized.label,
      status: normalized.status,
      displayOrder: normalized.order,
      data: normalized.edgeData,
    });
  });

  const nodes = [...nodesById.values()].toSorted(compareDisplayNodes);
  const inferredDomain = inferDomain(relationships);
  return {
    nodes,
    relationships,
    inferredDomain,
    inferredRootId: inferRelationshipRootId(nodes, relationships, inferredDomain),
  };
}

export function buildRelationshipChartInputFromRows(rows: RelationshipTableRow[]) {
  const graph = buildRelationshipGraphFromRows(rows);
  return {
    nodes: graph.nodes,
    relationships: graph.relationships,
    rootId: graph.inferredRootId,
    mode: inferRelationshipChartMode(graph.relationships),
    domain: graph.inferredDomain,
  };
}

export function getRelationshipDisplaySemantics(edge: Pick<RelationshipEdge, "type" | "status">): RelationshipDisplaySemantics {
  if (edge.type === "spouse") {
    return {
      domain: "family",
      pattern: "solid",
      placement: "horizontal",
      directional: false,
      description: "Current partners are shown on the same generation with a horizontal connector.",
    };
  }
  if (edge.type === "former_spouse") {
    return {
      domain: "family",
      pattern: "dashed",
      placement: "horizontal",
      directional: false,
      description: "Former partners stay on the same generation but use a dashed connector.",
    };
  }
  if (edge.type === "sibling") {
    return {
      domain: "family",
      pattern: "solid",
      placement: "same-row",
      directional: false,
      description: "Siblings share the same generation row and are ordered deterministically.",
    };
  }
  if (parentLikeTypes.has(edge.type) || childLikeTypes.has(edge.type)) {
    return {
      domain: "family",
      pattern: edge.status === "pending" ? "dashed" : "solid",
      placement: "vertical",
      directional: true,
      description: "Parent and child relationships are rendered across generation rows with vertical drops.",
    };
  }
  if (edge.type === "assistant") {
    return {
      domain: "org",
      pattern: "solid",
      placement: "side",
      directional: true,
      description: "Assistants attach on a side branch below the assisted role and above reports.",
    };
  }
  if (edge.type === "peer") {
    return {
      domain: "org",
      pattern: "dashed",
      placement: "same-row",
      directional: false,
      description: "Peers are same-level relationships; use a dashed connector only when the meaning is explicit.",
    };
  }
  return {
    domain: "org",
    pattern: edge.status === "pending" ? "dashed" : "solid",
    placement: "vertical",
    directional: true,
    description: "Management relationships are vertical solid reporting lines.",
  };
}
