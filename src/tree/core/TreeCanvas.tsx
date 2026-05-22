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
  defaultZoom,
  interactionMode = "pan",
  maxZoom,
  minZoom,
  onViewportChange,
  onZoomChange,
  style,
  theme,
  treeApiRef,
  viewport,
  zoom,
}: TreeCanvasProps<Person>): JSX.Element {
  return (
    <TreeSurface
      bounds={bounds}
      cards={cards as TreeLayoutCardBase<unknown>[]}
      className={className}
      ariaLabel={ariaLabel}
      defaultViewport={defaultViewport}
      defaultZoom={defaultZoom}
      interactionMode={interactionMode}
      maxZoom={maxZoom}
      minZoom={minZoom}
      onViewportChange={onViewportChange}
      onZoomChange={onZoomChange}
      style={style}
      subject={anchorId}
      theme={theme}
      treeApiRef={treeApiRef}
      treeType={treeType}
      viewport={viewport}
      zoom={zoom}
    >
      <div ref={containerRef} data-tree-root={anchorId} data-tree-renderer={treeType}>
        {children}
      </div>
    </TreeSurface>
  );
}
