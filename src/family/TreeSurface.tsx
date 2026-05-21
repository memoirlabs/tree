"use client";

import type { CSSProperties, JSX, PointerEvent, ReactNode, WheelEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import type { TreeInteractionMode } from "./types";
import type { TreeStylePreset, TreeTheme } from "./theme";
import { createTreeThemeStyle, getTreeStyleName } from "./theme";

const defaultTreeSurfaceStyle: CSSProperties = {
  background: "var(--tree-surface-bg, Canvas)",
  border: "var(--tree-outline-width, 1px) solid var(--tree-surface-border, color-mix(in srgb, CanvasText 14%, transparent))",
  borderRadius: "var(--tree-surface-radius, 8px)",
  boxSizing: "border-box",
  color: "var(--tree-surface-fg, CanvasText)",
  contain: "layout paint",
  fontFamily: "var(--tree-font-family, inherit)",
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
  defaultZoom?: number;
  interactionMode?: TreeInteractionMode;
  maxZoom?: number;
  minZoom?: number;
  onZoomChange?: (zoom: number) => void;
  style?: CSSProperties;
  subject?: string;
  theme?: TreeStylePreset | TreeTheme;
  treeType: "family" | "org";
  zoom?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getPointerDistance = (pointers: Map<number, { x: number; y: number }>): number | null => {
  const [first, second] = Array.from(pointers.values());
  if (!first || !second) return null;
  return Math.hypot(second.x - first.x, second.y - first.y);
};

export function TreeSurface({
  bounds,
  children,
  className,
  defaultZoom = 1,
  interactionMode = "pan",
  maxZoom = 2.5,
  minZoom = 0.4,
  onZoomChange,
  style,
  subject,
  theme,
  treeType,
  zoom,
}: TreeSurfaceProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [uncontrolledZoom, setUncontrolledZoom] = useState(defaultZoom);
  const currentZoom = clamp(zoom ?? uncontrolledZoom, minZoom, maxZoom);
  const dragRef = useRef<{
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
    x: number;
    y: number;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
  } | null>(null);

  const updateZoom = useCallback(
    (nextZoom: number) => {
      const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
      if (zoom === undefined) setUncontrolledZoom(clampedZoom);
      onZoomChange?.(clampedZoom);
    },
    [maxZoom, minZoom, onZoomChange, zoom],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || interactionMode === "none") return;

    const maxLeft = container.scrollWidth - container.clientWidth;
    const maxTop = container.scrollHeight - container.clientHeight;
    if (maxLeft > 0) container.scrollLeft = maxLeft / 2;
    if (maxTop > 0) container.scrollTop = maxTop / 2;
  }, [bounds.height, bounds.width, currentZoom, interactionMode]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (interactionMode !== "pan" || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-tree-card]")) return;

      const container = event.currentTarget;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointersRef.current.size === 2) {
        const distance = getPointerDistance(pointersRef.current);
        if (distance) {
          pinchRef.current = { distance, zoom: currentZoom };
          dragRef.current = null;
        }
        container.setPointerCapture(event.pointerId);
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        x: event.clientX,
        y: event.clientY,
      };
      container.setPointerCapture(event.pointerId);
    },
    [currentZoom, interactionMode],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      const pinch = pinchRef.current;
      if (pinch) {
        const distance = getPointerDistance(pointersRef.current);
        if (distance) updateZoom(pinch.zoom * (distance / pinch.distance));
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const container = event.currentTarget;
      container.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
      container.scrollTop = drag.scrollTop - (event.clientY - drag.y);
    },
    [updateZoom],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (interactionMode === "none" || !event.ctrlKey) return;
      event.preventDefault();
      updateZoom(currentZoom * (1 - event.deltaY * 0.002));
    },
    [currentZoom, interactionMode, updateZoom],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      data-tree-interaction={interactionMode}
      data-tree-subject={subject}
      data-tree-style={getTreeStyleName(theme)}
      data-tree-surface
      data-tree-type={treeType}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        ...defaultTreeSurfaceStyle,
        ...createTreeThemeStyle(theme),
        cursor: interactionMode === "pan" ? "grab" : undefined,
        overflow: interactionMode === "scroll" ? "auto" : "hidden",
        ...style,
      }}
    >
      <div
        data-tree-canvas
        style={{
          height: bounds.height * currentZoom,
          minHeight: "100%",
          minWidth: "100%",
          position: "relative",
          background: "var(--tree-canvas-bg, transparent)",
          width: bounds.width * currentZoom,
        }}
      >
        <div
          style={{
            height: bounds.height,
            position: "relative",
            transform: `scale(${currentZoom})`,
            transformOrigin: "0 0",
            width: bounds.width,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
