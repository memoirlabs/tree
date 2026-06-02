"use client";

import type { CSSProperties, JSX, PointerEvent, ReactNode, Ref, UIEvent } from "react";
import { useCallback, useImperativeHandle, useLayoutEffect, useRef } from "react";

import type {
  PersonId,
  TreeApi,
  TreeInitialViewport,
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

function clampViewport(container: HTMLDivElement, viewport: TreeViewport): TreeViewport {
  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  return {
    x: Math.min(Math.max(0, viewport.x), maxLeft),
    y: Math.min(Math.max(0, viewport.y), maxTop),
  };
}

function getDefaultViewport(
  initialViewport: TreeInitialViewport | undefined,
  defaultViewport: Partial<TreeViewport> | undefined,
): TreeViewport {
  if (initialViewport && typeof initialViewport === "object" && !("mode" in initialViewport)) {
    return {
      x: initialViewport.x ?? 0,
      y: initialViewport.y ?? 0,
    };
  }
  return {
    x: defaultViewport?.x ?? 0,
    y: defaultViewport?.y ?? 0,
  };
}

function getCenteredCanvasViewport(container: HTMLDivElement): TreeViewport {
  return clampViewport(container, {
    x: (container.scrollWidth - container.clientWidth) / 2,
    y: (container.scrollHeight - container.clientHeight) / 2,
  });
}

function getCenteredCardViewport(
  container: HTMLDivElement,
  card: TreeLayoutCardBase<unknown>,
): TreeViewport {
  return clampViewport(container, {
    x: card.x + card.width / 2 - container.clientWidth / 2,
    y: card.y + card.height / 2 - container.clientHeight / 2,
  });
}

function getInitialViewportKey(
  initialViewport: TreeInitialViewport | undefined,
  defaultViewport: Partial<TreeViewport> | undefined,
  subject: PersonId | undefined,
): string {
  if (!initialViewport) {
    return `center-canvas:${subject ?? ""}:${defaultViewport?.x ?? ""}:${defaultViewport?.y ?? ""}`;
  }
  if (initialViewport === "canvas") return "center-canvas";
  if (initialViewport === "subject") return `center-root:${subject ?? ""}`;
  if (!("mode" in initialViewport)) {
    return `position:${initialViewport.x ?? 0}:${initialViewport.y ?? 0}`;
  }
  if (initialViewport.mode === "center-person") {
    return `center-person:${initialViewport.personId}`;
  }
  return initialViewport.mode === "center-root"
    ? `center-root:${subject ?? ""}`
    : initialViewport.mode;
}

function resolveInitialViewport({
  cards,
  container,
  defaultViewport,
  initialViewport,
  subject,
}: {
  cards: TreeLayoutCardBase<unknown>[];
  container: HTMLDivElement;
  defaultViewport: Partial<TreeViewport> | undefined;
  initialViewport: TreeInitialViewport | undefined;
  subject: PersonId | undefined;
}): TreeViewport {
  if (!initialViewport) return getCenteredCanvasViewport(container);
  if (initialViewport === "canvas") return getCenteredCanvasViewport(container);
  if (initialViewport === "subject") {
    const card = subject ? cards.find((candidate) => candidate.personId === subject) : undefined;
    return card ? getCenteredCardViewport(container, card) : getCenteredCanvasViewport(container);
  }
  if (!("mode" in initialViewport)) {
    return clampViewport(container, getDefaultViewport(initialViewport, defaultViewport));
  }
  if (initialViewport.mode === "center-canvas") return getCenteredCanvasViewport(container);

  const personId = initialViewport.mode === "center-root" ? subject : initialViewport.personId;
  const card = personId ? cards.find((candidate) => candidate.personId === personId) : undefined;
  return card ? getCenteredCardViewport(container, card) : getCenteredCanvasViewport(container);
}

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
  initialViewport?: TreeInitialViewport;
  interactionMode?: TreeInteractionMode;
  onViewportChange?: (viewport: TreeViewport) => void;
  treeApiRef?: Ref<TreeApi>;
  style?: CSSProperties;
  subject?: PersonId;
  theme?: TreeStylePreset;
  treeType: "family" | "org-chart";
  viewport?: TreeViewport;
}

export function TreeSurface({
  bounds,
  cards = [],
  children,
  className,
  ariaLabel = "Tree",
  defaultViewport,
  initialViewport,
  interactionMode = "pan",
  onViewportChange,
  style,
  subject,
  theme,
  treeApiRef,
  treeType,
  viewport,
}: TreeSurfaceProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastCenteredKeyRef = useRef<string | null>(null);
  const lastViewportRef = useRef<TreeViewport>({
    x: getDefaultViewport(initialViewport, defaultViewport).x,
    y: getDefaultViewport(initialViewport, defaultViewport).y,
  });
  const initialViewportKey = getInitialViewportKey(initialViewport, defaultViewport, subject);
  const measurementKey = cards
    .map((card) => `${card.personId}:${card.x}:${card.y}:${card.width}:${card.height}`)
    .join("|");
  const centerKey = `${interactionMode}:${initialViewportKey}:${bounds.width}:${bounds.height}:${measurementKey}`;
  const dragRef = useRef<{
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
    x: number;
    y: number;
  } | null>(null);

  const updateViewport = useCallback(
    (nextViewport: TreeViewport) => {
      const clampedViewport: TreeViewport = {
        x: Math.max(0, nextViewport.x),
        y: Math.max(0, nextViewport.y),
      };
      lastViewportRef.current = clampedViewport;
      onViewportChange?.(clampedViewport);
    },
    [onViewportChange],
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

    const nextViewport = resolveInitialViewport({
      cards,
      container,
      defaultViewport,
      initialViewport,
      subject,
    });
    container.scrollLeft = nextViewport.x;
    container.scrollTop = nextViewport.y;
    lastCenteredKeyRef.current = centerKey;
    updateViewport({ x: container.scrollLeft, y: container.scrollTop });
  }, [cards, centerKey, defaultViewport, initialViewport, interactionMode, subject, updateViewport, viewport]);

  const centerPerson = useCallback(
    (personId: PersonId) => {
      const container = containerRef.current;
      const card = cards.find((candidate) => candidate.personId === personId);
      if (!container || !card) return;
      const nextViewport = getCenteredCardViewport(container, card);
      container.scrollLeft = nextViewport.x;
      container.scrollTop = nextViewport.y;
      updateViewport({ x: container.scrollLeft, y: container.scrollTop });
    },
    [cards, updateViewport],
  );

  const resetViewport = useCallback(() => {
    const container = containerRef.current;
    const nextViewport = container
      ? initialViewport
        ? resolveInitialViewport({
            cards,
            container,
            defaultViewport,
            initialViewport,
            subject,
          })
        : clampViewport(container, getDefaultViewport(initialViewport, defaultViewport))
      : getDefaultViewport(initialViewport, defaultViewport);
    if (container) {
      container.scrollLeft = nextViewport.x;
      container.scrollTop = nextViewport.y;
    }
    lastCenteredKeyRef.current = null;
    updateViewport(nextViewport);
  }, [cards, defaultViewport, initialViewport, subject, updateViewport]);

  useImperativeHandle(
    treeApiRef,
    () => ({
      centerPerson,
      fitToSubject: () => {
        if (subject) centerPerson(subject);
      },
      resetViewport,
    }),
    [centerPerson, resetViewport, subject],
  );

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

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const container = event.currentTarget;
      container.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
      container.scrollTop = drag.scrollTop - (event.clientY - drag.y);
      updateViewport({ x: container.scrollLeft, y: container.scrollTop });
    },
    [updateViewport],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
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

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      updateViewport({
        x: event.currentTarget.scrollLeft,
        y: event.currentTarget.scrollTop,
      });
    },
    [updateViewport],
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
          background: "var(--tree-canvas-bg, transparent)",
          width: bounds.width,
        }}
      >
        <div
          style={{
            height: bounds.height,
            position: "relative",
            width: bounds.width,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
