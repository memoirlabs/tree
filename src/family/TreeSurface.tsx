"use client";

import type { CSSProperties, JSX, PointerEvent, ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef } from "react";

import type { TreeInteractionMode } from "./types";

const defaultTreeSurfaceStyle: CSSProperties = {
  background: "Canvas",
  border: "1px solid color-mix(in srgb, CanvasText 14%, transparent)",
  borderRadius: 8,
  boxSizing: "border-box",
  color: "CanvasText",
  contain: "layout paint",
  height: "100%",
  maxHeight: "inherit",
  maxWidth: "100%",
  minHeight: 360,
  minWidth: 0,
  overscrollBehavior: "contain",
  position: "relative",
  touchAction: "none",
  userSelect: "none",
  width: "100%",
};

export interface TreeSurfaceProps {
  bounds: {
    width: number;
    height: number;
  };
  children: ReactNode;
  className?: string;
  interactionMode?: TreeInteractionMode;
  style?: CSSProperties;
  subject?: string;
  treeType: "family" | "org";
}

export function TreeSurface({
  bounds,
  children,
  className,
  interactionMode = "pan",
  style,
  subject,
  treeType,
}: TreeSurfaceProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || interactionMode === "none") return;

    const maxLeft = container.scrollWidth - container.clientWidth;
    const maxTop = container.scrollHeight - container.clientHeight;
    if (maxLeft > 0) container.scrollLeft = maxLeft / 2;
    if (maxTop > 0) container.scrollTop = maxTop / 2;
  }, [bounds.height, bounds.width, interactionMode]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (interactionMode !== "pan" || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-tree-card]")) return;

      const container = event.currentTarget;
      dragRef.current = {
        pointerId: event.pointerId,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        x: event.clientX,
        y: event.clientY,
      };
      container.setPointerCapture(event.pointerId);
    },
    [interactionMode],
  );

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const container = event.currentTarget;
    container.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    container.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      data-tree-interaction={interactionMode}
      data-tree-subject={subject}
      data-tree-surface
      data-tree-type={treeType}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        ...defaultTreeSurfaceStyle,
        cursor: interactionMode === "pan" ? "grab" : undefined,
        overflow: interactionMode === "scroll" ? "auto" : "hidden",
        ...style,
      }}
    >
      <div
        data-tree-canvas
        style={{
          height: bounds.height,
          minHeight: "100%",
          minWidth: "100%",
          position: "relative",
          width: bounds.width,
        }}
      >
        {children}
      </div>
    </div>
  );
}
