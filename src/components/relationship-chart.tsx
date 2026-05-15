"use client";

import type { JSX, ReactNode } from "react";
import { useMemo } from "react";

import {
  buildRelationshipChartInputFromRows,
  inferRelationshipChartMode,
  inferRelationshipRootId,
} from "../adapters";
import {
  createRelationshipIndex,
  getDownstream,
  getFormerSpouses,
  getManagers,
  getPeers,
  getSiblings,
  getSpouses,
  getUpstream,
} from "../relationships";
import type { RelationshipTableRow } from "../adapters";
import type { RelationshipEdge, RelationshipNode } from "../relationships";

export type RelationshipChartMode = "auto" | "family" | "org" | "upstream" | "downstream" | "all";

export interface RelationshipChartRenderNodeOptions {
  isRoot: boolean;
  depth: number;
  mode: RelationshipChartMode;
}

export interface RelationshipChartLevel {
  id: string;
  label: string;
  depth: number;
  nodes: RelationshipNode[];
}

export interface RelationshipChartProps {
  nodes?: RelationshipNode[];
  relationships?: RelationshipEdge[];
  rows?: RelationshipTableRow[];
  rootId?: string;
  mode?: RelationshipChartMode;
  className?: string;
  renderNode?: (node: RelationshipNode, options: RelationshipChartRenderNodeOptions) => ReactNode;
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

const createLevel = (
  id: string,
  label: string,
  depth: number,
  nodes: RelationshipNode[],
): RelationshipChartLevel | null => {
  const uniqueNodes = compactUniqueNodes(nodes);
  if (uniqueNodes.length === 0) return null;
  return { id, label, depth, nodes: uniqueNodes };
};

export function buildRelationshipChartLevels(
  nodes: RelationshipNode[],
  relationships: RelationshipEdge[],
  rootId: string,
  mode: RelationshipChartMode = "all",
): RelationshipChartLevel[] {
  const resolvedMode = mode === "auto" ? inferRelationshipChartMode(relationships) : mode;
  const index = createRelationshipIndex(nodes, relationships);
  const root = index.nodesById.get(rootId);
  if (!root) return [];

  if (resolvedMode === "upstream") {
    return [
      ...getUpstream(index, rootId)
        .toReversed()
        .map((level) => ({
          id: `upstream-${level.depth}`,
          label: "Upstream",
          depth: -level.depth,
          nodes: level.nodes,
        })),
      { id: "root", label: "Root", depth: 0, nodes: [root] },
    ];
  }

  if (resolvedMode === "downstream") {
    return [
      { id: "root", label: "Root", depth: 0, nodes: [root] },
      ...getDownstream(index, rootId).map((level) => ({
        id: `downstream-${level.depth}`,
        label: "Downstream",
        depth: level.depth,
        nodes: level.nodes,
      })),
    ];
  }

  if (resolvedMode === "family") {
    return [
      createLevel("parents", "Parents", -1, getUpstream(index, rootId, { maxDepth: 1 }).flatMap((level) => level.nodes)),
      createLevel("partners", "Partners", 0, [...getSpouses(index, rootId), ...getFormerSpouses(index, rootId)]),
      createLevel("current", "Current", 0, [root, ...getSiblings(index, rootId)]),
      createLevel("children", "Children", 1, getDownstream(index, rootId, { maxDepth: 1 }).flatMap((level) => level.nodes)),
    ].filter((level): level is RelationshipChartLevel => Boolean(level));
  }

  if (resolvedMode === "org") {
    return [
      createLevel("managers", "Managers", -1, getManagers(index, rootId)),
      createLevel("current", "Current", 0, [root, ...getPeers(index, rootId)]),
      createLevel("reports", "Reports", 1, getDownstream(index, rootId, { maxDepth: 1 }).flatMap((level) => level.nodes)),
    ].filter((level): level is RelationshipChartLevel => Boolean(level));
  }

  return [
    ...getUpstream(index, rootId)
      .toReversed()
      .map((level) => ({
        id: `upstream-${level.depth}`,
        label: "Upstream",
        depth: -level.depth,
        nodes: level.nodes,
      })),
    createLevel("current", "Current", 0, [
      ...getSpouses(index, rootId),
      ...getFormerSpouses(index, rootId),
      root,
      ...getSiblings(index, rootId),
      ...getPeers(index, rootId),
    ]),
    ...getDownstream(index, rootId).map((level) => ({
      id: `downstream-${level.depth}`,
      label: "Downstream",
      depth: level.depth,
      nodes: level.nodes,
    })),
  ].filter((level): level is RelationshipChartLevel => Boolean(level));
}

/**
 * Render an unstyled, schema-friendly relationship chart from generic nodes and edges.
 */
export function RelationshipChart({
  nodes,
  relationships,
  rows,
  rootId,
  mode = "auto",
  className,
  renderNode,
}: RelationshipChartProps): JSX.Element {
  const chartInput = useMemo(() => {
    if (rows) {
      const input = buildRelationshipChartInputFromRows(rows);
      return {
        nodes: input.nodes,
        relationships: input.relationships,
        rootId: rootId ?? input.rootId,
        mode: mode === "auto" ? input.mode : mode,
      };
    }
    const resolvedNodes = nodes ?? [];
    const resolvedRelationships = relationships ?? [];
    return {
      nodes: resolvedNodes,
      relationships: resolvedRelationships,
      rootId: rootId ?? inferRelationshipRootId(resolvedNodes, resolvedRelationships),
      mode: mode === "auto" ? inferRelationshipChartMode(resolvedRelationships) : mode,
    };
  }, [mode, nodes, relationships, rootId, rows]);

  const levels = useMemo(
    () =>
      chartInput.rootId
        ? buildRelationshipChartLevels(chartInput.nodes, chartInput.relationships, chartInput.rootId, chartInput.mode)
        : [],
    [chartInput],
  );

  return (
    <div data-relationship-chart data-relationship-mode={chartInput.mode} className={className}>
      {levels.map((level) => (
        <div
          key={level.id}
          data-relationship-level={level.id}
          data-relationship-depth={level.depth}
          aria-label={level.label}
        >
          {level.nodes.map((node) => (
            <div key={node.id} data-relationship-node-id={node.id}>
              {renderNode
                ? renderNode(node, {
                    isRoot: node.id === chartInput.rootId,
                    depth: level.depth,
                    mode: chartInput.mode,
                  })
                : node.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
