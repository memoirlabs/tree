"use client";

import type { CSSProperties, JSX, PointerEvent, ReactNode, Ref, UIEvent, WheelEvent } from "react";
import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

import type {
  PersonId,
  TreeApi,
  TreeInteractionMode,
  TreeLayoutCardBase,
  TreeStylePreset,
  TreeViewport,
} from "./types";
import { getTreeStyleName } from "./theme";

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
  cards?: TreeLayoutCardBase<unknown>[];
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  defaultViewport?: Partial<TreeViewport>;
  defaultZoom?: number;
  interactionMode?: TreeInteractionMode;
  maxZoom?: number;
  minZoom?: number;
  onViewportChange?: (viewport: TreeViewport) => void;
  onZoomChange?: (zoom: number) => void;
  treeApiRef?: Ref<TreeApi>;
  style?: CSSProperties;
  subject?: PersonId;
  theme?: TreeStylePreset;
  treeType: "family" | "org-chart";
  viewport?: TreeViewport;
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
  cards = [],
  children,
  className,
  ariaLabel = "Tree",
  defaultViewport,
  defaultZoom = 1,
  interactionMode = "pan",
  maxZoom = 2.5,
  minZoom = 0.4,
  onViewportChange,
  onZoomChange,
  style,
  subject,
  theme,
  treeApiRef,
  treeType,
  viewport,
  zoom,
}: TreeSurfaceProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastCenteredKeyRef = useRef<string | null>(null);
  const [uncontrolledViewport, setUncontrolledViewport] = useState<TreeViewport>({
    x: defaultViewport?.x ?? 0,
    y: defaultViewport?.y ?? 0,
    zoom: defaultViewport?.zoom ?? defaultZoom,
  });
  const currentZoom = clamp(viewport?.zoom ?? zoom ?? uncontrolledViewport.zoom, minZoom, maxZoom);
  const centerKey = `${interactionMode}:${subject ?? ""}:${bounds.width}:${bounds.height}`;
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

  const updateViewport = useCallback(
    (nextViewport: TreeViewport, notifyZoom = false) => {
      const clampedViewport = {
        x: Math.max(0, nextViewport.x),
        y: Math.max(0, nextViewport.y),
        zoom: clamp(nextViewport.zoom, minZoom, maxZoom),
      };
      if (viewport === undefined) setUncontrolledViewport(clampedViewport);
      onViewportChange?.(clampedViewport);
      if (notifyZoom) onZoomChange?.(clampedViewport.zoom);
    },
    [maxZoom, minZoom, onViewportChange, onZoomChange, viewport],
  );

  const updateZoom = useCallback(
    (nextZoom: number, x?: number, y?: number) => {
      const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
      updateViewport(
        {
          x: x ?? containerRef.current?.scrollLeft ?? uncontrolledViewport.x,
          y: y ?? containerRef.current?.scrollTop ?? uncontrolledViewport.y,
          zoom: clampedZoom,
        },
        true,
      );
    },
    [maxZoom, minZoom, uncontrolledViewport.x, uncontrolledViewport.y, updateViewport],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || interactionMode === "none") return;
    if (viewport) {
      container.scrollLeft = viewport.x;
      container.scrollTop = viewport.y;
      return;
    }
    if (lastCenteredKeyRef.current === centerKey) return;

    const maxLeft = container.scrollWidth - container.clientWidth;
    const maxTop = container.scrollHeight - container.clientHeight;
    if (maxLeft > 0) container.scrollLeft = maxLeft / 2;
    if (maxTop > 0) container.scrollTop = maxTop / 2;
    lastCenteredKeyRef.current = centerKey;
    updateViewport({ x: container.scrollLeft, y: container.scrollTop, zoom: currentZoom });
  }, [centerKey, currentZoom, interactionMode, updateViewport, viewport]);

  const centerPerson = useCallback(
    (personId: PersonId) => {
      const container = containerRef.current;
      const card = cards.find((candidate) => candidate.personId === personId);
      if (!container || !card) return;
      const nextX = card.x * currentZoom + (card.width * currentZoom) / 2 - container.clientWidth / 2;
      const nextY = card.y * currentZoom + (card.height * currentZoom) / 2 - container.clientHeight / 2;
      container.scrollLeft = Math.max(0, nextX);
      container.scrollTop = Math.max(0, nextY);
      updateViewport({ x: container.scrollLeft, y: container.scrollTop, zoom: currentZoom });
    },
    [cards, currentZoom, updateViewport],
  );

  const resetViewport = useCallback(() => {
    const nextZoom = defaultViewport?.zoom ?? defaultZoom;
    const nextViewport = {
      x: defaultViewport?.x ?? 0,
      y: defaultViewport?.y ?? 0,
      zoom: nextZoom,
    };
    const container = containerRef.current;
    if (container) {
      container.scrollLeft = nextViewport.x;
      container.scrollTop = nextViewport.y;
    }
    lastCenteredKeyRef.current = null;
    updateViewport(nextViewport, true);
  }, [defaultViewport?.x, defaultViewport?.y, defaultViewport?.zoom, defaultZoom, updateViewport]);

  useImperativeHandle(
    treeApiRef,
    () => ({
      centerPerson,
      fitToSubject: () => {
        if (subject) centerPerson(subject);
      },
      resetViewport,
      zoomTo: (nextZoom) => updateZoom(nextZoom),
    }),
    [centerPerson, resetViewport, subject, updateZoom],
  );

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
      updateViewport({ x: container.scrollLeft, y: container.scrollTop, zoom: currentZoom });
    },
    [currentZoom, updateViewport, updateZoom],
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
      updateZoom(currentZoom * (1 - event.deltaY * 0.002), event.currentTarget.scrollLeft, event.currentTarget.scrollTop);
    },
    [currentZoom, interactionMode, updateZoom],
  );

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      updateViewport({
        x: event.currentTarget.scrollLeft,
        y: event.currentTarget.scrollTop,
        zoom: currentZoom,
      });
    },
    [currentZoom, updateViewport],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label={ariaLabel}
      data-tree-interaction={interactionMode}
      data-tree-subject={subject}
      data-tree-style={getTreeStyleName(theme)}
      data-tree-surface
      data-tree-type={treeType}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onScroll={handleScroll}
      onWheel={handleWheel}
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
