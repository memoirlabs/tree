"use client";

import type { SVGProps, JSX } from "react";
import type { TreeLayoutEdge, TreeLineShape } from "./types";

type TreeEdgeDomProps = SVGProps<SVGPathElement> & Record<`data-${string}`, string | number | undefined>;

export interface TreeEdgesProps {
  bounds: {
    width: number;
    height: number;
  };
  edgeClassName?: string;
  edges: TreeLayoutEdge[];
  getEdgeProps?: (edge: TreeLayoutEdge) => TreeEdgeDomProps;
  lineShape: TreeLineShape;
}

export function TreeEdges({ bounds, edgeClassName, edges, getEdgeProps, lineShape }: TreeEdgesProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width={bounds.width}
      height={bounds.height}
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      fill="none"
      style={{
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
        position: "absolute",
      }}
    >
      {edges.map((edge) => {
        const edgeProps = getEdgeProps?.(edge);
        return (
          <path
            key={edge.id}
            className={edgeClassName}
            d={edge.path}
            data-edge-kind={edge.kind}
            data-edge-status={edge.status}
            data-source-id={edge.sourceId}
            data-target-id={edge.targetId}
            data-tree-edge
            fill="none"
            stroke="currentColor"
            strokeLinecap={lineShape === "curved" ? "round" : "butt"}
            strokeLinejoin={lineShape === "curved" ? "round" : "miter"}
            style={{ strokeWidth: "var(--tree-edge-width, 2)", ...edgeProps?.style }}
            {...edgeProps}
          />
        );
      })}
    </svg>
  );
}
