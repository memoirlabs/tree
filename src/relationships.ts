import type { FamilyMember, RelationType } from "./types";

export type RelationshipDirection = "upstream" | "downstream" | "symmetric";

export interface RelationshipNode {
  id: string;
  label: string;
  displayOrder?: number;
  data?: unknown;
}

export interface RelationshipEdge {
  id?: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  label?: string;
  status?: "active" | "former" | "pending";
  displayOrder?: number;
  data?: unknown;
}

export interface RelationshipConnection {
  node: RelationshipNode;
  edge: RelationshipEdge;
  direction: RelationshipDirection;
}

export interface RelationshipIndex {
  nodes: RelationshipNode[];
  relationships: RelationshipEdge[];
  nodesById: Map<string, RelationshipNode>;
  outgoingById: Map<string, RelationshipEdge[]>;
  incomingById: Map<string, RelationshipEdge[]>;
}

export interface TraverseRelationshipOptions {
  maxDepth?: number;
  includeRoot?: boolean;
}

export interface RelationshipLevel {
  depth: number;
  nodes: RelationshipNode[];
}

const downstreamRelationTypes = new Set<RelationType>(["parent", "manager", "ceo"]);
const reverseDownstreamRelationTypes = new Set<RelationType>(["child", "direct_report", "assistant"]);

const getOrCreateList = <K, V>(map: Map<K, V[]>, key: K): V[] => {
  const existing = map.get(key);
  if (existing) return existing;
  const created: V[] = [];
  map.set(key, created);
  return created;
};

export function createRelationshipIndex(
  nodes: RelationshipNode[],
  relationships: RelationshipEdge[],
): RelationshipIndex {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const outgoingById = new Map<string, RelationshipEdge[]>();
  const incomingById = new Map<string, RelationshipEdge[]>();

  for (const relationship of relationships) {
    getOrCreateList(outgoingById, relationship.sourceId).push(relationship);
    getOrCreateList(incomingById, relationship.targetId).push(relationship);
  }

  return {
    nodes,
    relationships,
    nodesById,
    outgoingById,
    incomingById,
  };
}

const compactUniqueNodes = (nodes: RelationshipNode[]): RelationshipNode[] => {
  const seen = new Set<string>();
  const unique: RelationshipNode[] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    unique.push(node);
  }
  return unique;
};

const getNode = (index: RelationshipIndex, id: string): RelationshipNode | undefined => index.nodesById.get(id);

const getSymmetricConnections = (index: RelationshipIndex, nodeId: string, types: Set<RelationType>) => {
  const connections: RelationshipConnection[] = [];
  for (const edge of index.outgoingById.get(nodeId) ?? []) {
    if (!types.has(edge.type)) continue;
    const node = getNode(index, edge.targetId);
    if (node) connections.push({ node, edge, direction: "symmetric" });
  }
  for (const edge of index.incomingById.get(nodeId) ?? []) {
    if (!types.has(edge.type)) continue;
    const node = getNode(index, edge.sourceId);
    if (node) connections.push({ node, edge, direction: "symmetric" });
  }
  return connections;
};

const getDownstreamConnections = (index: RelationshipIndex, nodeId: string): RelationshipConnection[] => {
  const connections: RelationshipConnection[] = [];
  for (const edge of index.outgoingById.get(nodeId) ?? []) {
    if (!downstreamRelationTypes.has(edge.type)) continue;
    const node = getNode(index, edge.targetId);
    if (node) connections.push({ node, edge, direction: "downstream" });
  }
  for (const edge of index.incomingById.get(nodeId) ?? []) {
    if (!reverseDownstreamRelationTypes.has(edge.type)) continue;
    const node = getNode(index, edge.sourceId);
    if (node) connections.push({ node, edge, direction: "downstream" });
  }
  return connections;
};

const getUpstreamConnections = (index: RelationshipIndex, nodeId: string): RelationshipConnection[] => {
  const connections: RelationshipConnection[] = [];
  for (const edge of index.incomingById.get(nodeId) ?? []) {
    if (!downstreamRelationTypes.has(edge.type)) continue;
    const node = getNode(index, edge.sourceId);
    if (node) connections.push({ node, edge, direction: "upstream" });
  }
  for (const edge of index.outgoingById.get(nodeId) ?? []) {
    if (!reverseDownstreamRelationTypes.has(edge.type)) continue;
    const node = getNode(index, edge.targetId);
    if (node) connections.push({ node, edge, direction: "upstream" });
  }
  return connections;
};

const traverseLevels = (
  index: RelationshipIndex,
  rootId: string,
  direction: "upstream" | "downstream",
  options: TraverseRelationshipOptions = {},
): RelationshipLevel[] => {
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const root = getNode(index, rootId);
  if (!root) return [];

  const levels: RelationshipLevel[] = options.includeRoot ? [{ depth: 0, nodes: [root] }] : [];
  const seen = new Set([rootId]);
  let frontier = [rootId];
  let depth = 1;

  while (frontier.length > 0 && depth <= maxDepth) {
    const nextIds: string[] = [];
    const nextNodes: RelationshipNode[] = [];
    for (const id of frontier) {
      const connections =
        direction === "upstream" ? getUpstreamConnections(index, id) : getDownstreamConnections(index, id);
      for (const connection of connections) {
        if (seen.has(connection.node.id)) continue;
        seen.add(connection.node.id);
        nextIds.push(connection.node.id);
        nextNodes.push(connection.node);
      }
    }
    if (nextNodes.length === 0) break;
    levels.push({ depth, nodes: compactUniqueNodes(nextNodes) });
    frontier = nextIds;
    depth += 1;
  }

  return levels;
};

export function getUpstream(
  index: RelationshipIndex,
  rootId: string,
  options?: TraverseRelationshipOptions,
): RelationshipLevel[] {
  return traverseLevels(index, rootId, "upstream", options);
}

export function getDownstream(
  index: RelationshipIndex,
  rootId: string,
  options?: TraverseRelationshipOptions,
): RelationshipLevel[] {
  return traverseLevels(index, rootId, "downstream", options);
}

export function getSpouses(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  return compactUniqueNodes(getSymmetricConnections(index, nodeId, new Set(["spouse"])).map((connection) => connection.node));
}

export function getFormerSpouses(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  return compactUniqueNodes(
    getSymmetricConnections(index, nodeId, new Set(["former_spouse"])).map((connection) => connection.node),
  );
}

export function getSiblings(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  const explicit = getSymmetricConnections(index, nodeId, new Set(["sibling"])).map((connection) => connection.node);
  const parents = getUpstream(index, nodeId, { maxDepth: 1 }).flatMap((level) => level.nodes);
  const sharedParentSiblings = parents.flatMap((parent) =>
    getDownstream(index, parent.id, { maxDepth: 1 })
      .flatMap((level) => level.nodes)
      .filter((node) => node.id !== nodeId),
  );
  return compactUniqueNodes([...explicit, ...sharedParentSiblings]);
}

export function getManagers(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  return compactUniqueNodes(
    getUpstreamConnections(index, nodeId)
      .filter((connection) => connection.edge.type === "manager" || connection.edge.type === "direct_report")
      .map((connection) => connection.node),
  );
}

export function getReports(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  return compactUniqueNodes(
    getDownstreamConnections(index, nodeId)
      .filter((connection) => connection.edge.type === "manager" || connection.edge.type === "direct_report")
      .map((connection) => connection.node),
  );
}

export function getPeers(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  const explicit = getSymmetricConnections(index, nodeId, new Set(["peer"])).map((connection) => connection.node);
  const managers = getManagers(index, nodeId);
  const managerPeers = managers.flatMap((manager) => getReports(index, manager.id).filter((node) => node.id !== nodeId));
  return compactUniqueNodes([...explicit, ...managerPeers]);
}

export function getCeoChain(index: RelationshipIndex, nodeId: string): RelationshipNode[] {
  const upstream = getUpstream(index, nodeId).flatMap((level) => level.nodes);
  return upstream.filter((node) =>
    (index.outgoingById.get(node.id) ?? []).some((edge) => edge.type === "ceo" || edge.type === "manager"),
  );
}

export function familyMemberToRelationshipNodes(rootMember: FamilyMember): {
  nodes: RelationshipNode[];
  relationships: RelationshipEdge[];
} {
  const nodesById = new Map<string, RelationshipNode>();
  const relationships: RelationshipEdge[] = [];
  const visit = (member: FamilyMember) => {
    if (nodesById.has(member.id)) return;
    nodesById.set(member.id, { id: member.id, label: member.name, data: member });
    for (const parent of member.parents ?? []) {
      visit(parent);
      relationships.push({ sourceId: parent.id, targetId: member.id, type: "parent" });
    }
    for (const sibling of member.siblings ?? []) {
      visit(sibling);
      relationships.push({ sourceId: member.id, targetId: sibling.id, type: "sibling" });
    }
    if (member.spouse) {
      visit(member.spouse);
      relationships.push({ sourceId: member.id, targetId: member.spouse.id, type: "spouse" });
    }
    for (const child of member.children ?? []) {
      visit(child);
      relationships.push({ sourceId: member.id, targetId: child.id, type: "parent" });
    }
  };

  visit(rootMember);
  return {
    nodes: [...nodesById.values()],
    relationships,
  };
}
