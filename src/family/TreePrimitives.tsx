"use client";

import type { ComponentType, CSSProperties, JSX, ReactNode, RefObject } from "react";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { TreeSurface } from "./TreeSurface";
import { useCardMeasurements } from "./use-card-measurements";
import type {
  FamilyCardProps,
  FamilyRelationship,
  FamilyTreePersonHandler,
  FamilyTreeProps,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
  TreeInteractionMode,
} from "./types";
import type { FamilyTreeLayoutResult } from "./layout";
import type { TreeLineShape, TreeStylePreset, TreeTheme } from "./theme";

export type TreePrimitiveType = "family";

export interface FamilyTreeProviderProps<Person> {
  type: "family";
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  children: ReactNode;
  collapsed?: PersonId[];
  lineShape?: TreeLineShape;
  onPersonClick?: FamilyTreeProps<Person>["onPersonClick"];
  onAddRelationship?: FamilyTreePersonHandler<Person>;
  readOnly?: boolean;
  selected?: PersonId;
  spacing?: Partial<FamilyTreeSpacing>;
}

export type TreeProviderProps<Person> = FamilyTreeProviderProps<Person>;

export interface FamilyTreePrimitiveContext<Person> {
  type: "family";
  collapsedIds: Set<PersonId>;
  containerRef: RefObject<HTMLDivElement | null>;
  layout: FamilyTreeLayoutResult<Person>;
  lineShape: TreeLineShape;
  onPersonClick?: FamilyTreeProps<Person>["onPersonClick"];
  onAddRelationship?: FamilyTreePersonHandler<Person>;
  readOnly: boolean;
  selected?: PersonId;
  subject: PersonId;
}

export type TreePrimitiveContext<Person> = FamilyTreePrimitiveContext<Person>;

export interface TreeCanvasProps {
  children: ReactNode;
  className?: string;
  defaultZoom?: number;
  interactionMode?: TreeInteractionMode;
  maxZoom?: number;
  minZoom?: number;
  onZoomChange?: (zoom: number) => void;
  style?: CSSProperties;
  theme?: TreeStylePreset | TreeTheme;
  zoom?: number;
}

export interface TreeEdgesProps {
  edgeClassName?: string;
}

export interface TreeNodeLayerProps<Person> {
  card: ComponentType<FamilyCardProps<Person>>;
  cardClassName?: string;
}

const TreePrimitiveContextObject = createContext<TreePrimitiveContext<unknown> | null>(null);

const createLayoutSpacing = (spacing?: Partial<FamilyTreeSpacing>) =>
  spacing
    ? {
        column: spacing.column,
        padding: spacing.padding,
        row: spacing.row,
      }
    : undefined;

export function TreeProvider<Person>(props: TreeProviderProps<Person>): JSX.Element {
  return <FamilyTreeProvider {...props} />;
}

function FamilyTreeProvider<Person>({
  subject,
  people,
  relationships,
  children,
  collapsed,
  lineShape = "orthogonal",
  onAddRelationship,
  onPersonClick,
  readOnly = false,
  selected,
  spacing,
}: FamilyTreeProviderProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layoutSpacing = useMemo(() => createLayoutSpacing(spacing), [spacing]);
  const unmeasuredLayout = useMemo(
    () => buildFamilyTreeLayout({ subject, people, relationships, collapsed, lineShape, spacing: layoutSpacing }),
    [collapsed, layoutSpacing, lineShape, people, relationships, subject],
  );
  const measureKey = unmeasuredLayout.cards.map((card) => card.personId).join("|");
  const measurements = useCardMeasurements(containerRef, measureKey);
  const layout = useMemo(
    () =>
      buildFamilyTreeLayout({
        subject,
        people,
        relationships,
        collapsed,
        measurements,
        lineShape,
        spacing: layoutSpacing,
      }),
    [collapsed, layoutSpacing, lineShape, measurements, people, relationships, subject],
  );
  const value = useMemo<FamilyTreePrimitiveContext<Person>>(
    () => ({
      type: "family",
      collapsedIds,
      containerRef,
      layout,
      lineShape,
      onAddRelationship,
      onPersonClick,
      readOnly,
      selected,
      subject,
    }),
    [collapsedIds, layout, lineShape, onAddRelationship, onPersonClick, readOnly, selected, subject],
  );

  return <TreePrimitiveContextObject.Provider value={value as TreePrimitiveContext<unknown>}>{children}</TreePrimitiveContextObject.Provider>;
}

export function useTreeLayout<Person = unknown>(): TreePrimitiveContext<Person> {
  const context = useContext(TreePrimitiveContextObject);
  if (!context) {
    throw new Error("Tree primitives must be rendered inside <TreeProvider>.");
  }
  return context as TreePrimitiveContext<Person>;
}

export function TreeCanvas({
  children,
  className,
  defaultZoom,
  interactionMode = "pan",
  maxZoom,
  minZoom,
  onZoomChange,
  style,
  theme,
  zoom,
}: TreeCanvasProps): JSX.Element {
  const context = useTreeLayout();

  return (
    <TreeSurface
      bounds={context.layout.bounds}
      className={className}
      defaultZoom={defaultZoom}
      interactionMode={interactionMode}
      maxZoom={maxZoom}
      minZoom={minZoom}
      onZoomChange={onZoomChange}
      style={style}
      subject={context.subject}
      theme={theme}
      treeType="family"
      zoom={zoom}
    >
      <div
        ref={context.containerRef}
        data-family-canvas
        data-family-interaction={interactionMode}
        data-family-subject={context.subject}
        data-family-tree
      >
        {children}
      </div>
    </TreeSurface>
  );
}

export function TreeEdges({ edgeClassName }: TreeEdgesProps): JSX.Element {
  const context = useTreeLayout();

  return (
    <svg
      aria-hidden="true"
      width={context.layout.bounds.width}
      height={context.layout.bounds.height}
      viewBox={`0 0 ${context.layout.bounds.width} ${context.layout.bounds.height}`}
      fill="none"
      style={{
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
        position: "absolute",
      }}
    >
      {context.layout.edges.map((edge) => (
        <path
          key={edge.id}
          className={edgeClassName}
          d={edge.path}
          data-edge-kind={edge.kind}
          data-edge-status={edge.status}
          data-family-edge
          data-source-id={edge.sourceId}
          data-target-id={edge.targetId}
          data-tree-edge
          fill="none"
          stroke="currentColor"
          strokeDasharray={edge.kind === "adoptive" || edge.kind === "guardian" || edge.status === "former" ? "4 4" : undefined}
          strokeLinecap={context.lineShape === "curved" ? "round" : "butt"}
          strokeLinejoin={context.lineShape === "curved" ? "round" : "miter"}
          strokeWidth="var(--tree-edge-width, 2)"
        />
      ))}
    </svg>
  );
}

export function TreeNodeLayer<Person>({ card: Card, cardClassName }: TreeNodeLayerProps<Person>): JSX.Element {
  const context = useTreeLayout<Person>();

  const handleFamilyClick = useCallback(
    (person: Person, personId: PersonId) => {
      context.onPersonClick?.(person, personId);
    },
    [context],
  );

  return (
    <>
      {context.layout.cards.map((layoutCard) => {
        const isSelected = context.selected ? context.selected === layoutCard.personId : layoutCard.personId === context.subject;
        const cardProps: FamilyCardProps<Person> = {
          person: layoutCard.person,
          personId: layoutCard.personId,
          relation: layoutCard.relation,
          selected: isSelected,
          focused: false,
          collapsed: context.collapsedIds.has(layoutCard.personId),
          readOnly: context.readOnly,
          className: cardClassName,
          onAddRelationship:
            context.readOnly || !context.onAddRelationship
              ? undefined
              : () => context.onAddRelationship?.(layoutCard.person, layoutCard.personId),
          "aria-selected": isSelected,
          "data-family-card": "",
          "data-tree-card": "",
          "data-person-id": layoutCard.personId,
          "data-relation": layoutCard.relation.label,
          "data-generation": layoutCard.relation.generation,
          "data-side": layoutCard.relation.side,
          onClick: context.onPersonClick ? () => handleFamilyClick(layoutCard.person, layoutCard.personId) : undefined,
        };

        return (
          <div
            key={layoutCard.personId}
            data-family-card-positioner
            data-person-id={layoutCard.personId}
            data-tree-card-positioner
            style={{
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translate(${layoutCard.x}px, ${layoutCard.y}px)`,
            }}
          >
            <div data-family-measure data-family-measure-id={layoutCard.personId}>
              <Card {...cardProps} />
            </div>
          </div>
        );
      })}
    </>
  );
}
