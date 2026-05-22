"use client";

import type { JSX, ReactNode, RefObject } from "react";
import { TreeSurface } from "./TreeSurface";
import type { TreeLayoutCardBase, TreeViewportProps } from "./types";

export interface TreeCanvasProps<Person> extends TreeViewportProps {
  anchorId: string;
  bounds: {
    width: number;
    height: number;
  };
  cards: TreeLayoutCardBase<Person>[];
  children: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  treeType: "family" | "org-chart";
}

export function TreeCanvas<Person>({
  anchorId,
  bounds,
  cards,
  children,
  containerRef,
  treeType,
  ariaLabel,
  className,
  defaultViewport,
  interactionMode = "pan",
  onViewportChange,
  style,
  theme,
  treeApiRef,
  viewport,
}: TreeCanvasProps<Person>): JSX.Element {
  return (
    <TreeSurface
      bounds={bounds}
      cards={cards as TreeLayoutCardBase<unknown>[]}
      className={className}
      ariaLabel={ariaLabel}
      defaultViewport={defaultViewport}
      interactionMode={interactionMode}
      onViewportChange={onViewportChange}
      style={style}
      subject={anchorId}
      theme={theme}
      treeApiRef={treeApiRef}
      treeType={treeType}
      viewport={viewport}
    >
      <div ref={containerRef} data-tree-root={anchorId} data-tree-renderer={treeType}>
        {children}
      </div>
    </TreeSurface>
  );
}
