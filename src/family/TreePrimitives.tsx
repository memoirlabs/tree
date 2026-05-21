"use client";

import type { ComponentType, CSSProperties, JSX, KeyboardEvent, ReactNode, Ref, RefObject } from "react";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { TreeSurface } from "./TreeSurface";
import { useCardMeasurements } from "./use-card-measurements";
import type {
  FamilyCardProps,
  FamilyRelationship,
  FamilyTreeCardProps,
  FamilyTreePersonHandler,
  FamilyTreeProps,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
  TreeApi,
  TreeInteractionMode,
  TreeViewport,
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
  getPersonLabel?: (person: Person, personId: PersonId) => string;
  readOnly?: boolean;
  selected?: PersonId;
  spacing?: Partial<FamilyTreeSpacing>;
  limits?: FamilyTreeProps<Person>["limits"];
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
  getPersonLabel?: (person: Person, personId: PersonId) => string;
  readOnly: boolean;
  selected?: PersonId;
  subject: PersonId;
}

export type TreePrimitiveContext<Person> = FamilyTreePrimitiveContext<Person>;

export interface TreeCanvasProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  defaultViewport?: Partial<TreeViewport>;
  defaultZoom?: number;
  interactionMode?: TreeInteractionMode;
  maxZoom?: number;
  minZoom?: number;
  onViewportChange?: (viewport: TreeViewport) => void;
  onZoomChange?: (zoom: number) => void;
  style?: CSSProperties;
  theme?: TreeStylePreset | TreeTheme;
  treeApiRef?: Ref<TreeApi>;
  viewport?: TreeViewport;
  zoom?: number;
}

export interface TreeEdgesProps {
  edgeClassName?: string;
}

export interface TreeNodeLayerProps<Person, CardExtraProps extends object = Record<string, never>> {
  card: ComponentType<FamilyCardProps<Person> & CardExtraProps>;
  cardClassName?: string;
  cardProps?: FamilyTreeCardProps<Person, CardExtraProps>;
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

const createMeasurementKey = (
  subject: PersonId,
  relationships: FamilyRelationship[],
  collapsed?: PersonId[],
) => {
  const relationshipKey = relationships
    .map((relationship) => {
      if (relationship.type === "partnership") {
        return `p:${relationship.partners.join(",")}`;
      }
      if (relationship.type === "guardianship") {
        return `g:${relationship.guardians.join(",")}>${relationship.children.join(",")}`;
      }
      return `r:${relationship.parents.join(",")}>${relationship.children.join(",")}`;
    })
    .join("|");
  return `${subject}::${collapsed?.join(",") ?? ""}::${relationshipKey}`;
};

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
  getPersonLabel,
  limits,
  onAddRelationship,
  onPersonClick,
  readOnly = false,
  selected,
  spacing,
}: FamilyTreeProviderProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layoutSpacing = useMemo(() => createLayoutSpacing(spacing), [spacing]);
  const measureKey = createMeasurementKey(subject, relationships, collapsed);
  const measurements = useCardMeasurements(containerRef, measureKey);
  const layout = useMemo(
    () =>
      buildFamilyTreeLayout({
        subject,
        people,
        relationships,
        collapsed,
        measurements,
        limits,
        lineShape,
        spacing: layoutSpacing,
      }),
    [collapsed, layoutSpacing, limits, lineShape, measurements, people, relationships, subject],
  );
  const value = useMemo<FamilyTreePrimitiveContext<Person>>(
    () => ({
      type: "family",
      collapsedIds,
      containerRef,
      layout,
      lineShape,
      getPersonLabel,
      onAddRelationship,
      onPersonClick,
      readOnly,
      selected,
      subject,
    }),
    [collapsedIds, layout, lineShape, getPersonLabel, onAddRelationship, onPersonClick, readOnly, selected, subject],
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
}: TreeCanvasProps): JSX.Element {
  const context = useTreeLayout();

  return (
    <TreeSurface
      bounds={context.layout.bounds}
      cards={context.layout.cards}
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
      subject={context.subject}
      theme={theme}
      treeApiRef={treeApiRef}
      treeType="family"
      viewport={viewport}
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
          style={{ strokeWidth: "var(--tree-edge-width, 2)" }}
        />
      ))}
    </svg>
  );
}

export function TreeNodeLayer<Person, CardExtraProps extends object = Record<string, never>>({
  card: Card,
  cardClassName,
  cardProps,
}: TreeNodeLayerProps<Person, CardExtraProps>): JSX.Element {
  const context = useTreeLayout<Person>();

  const handleFamilyClick = useCallback(
    (person: Person, personId: PersonId) => {
      context.onPersonClick?.(person, personId);
    },
    [context],
  );
  const handleFamilyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, person: Person, personId: PersonId) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      context.onPersonClick?.(person, personId);
    },
    [context],
  );

  return (
    <>
      {context.layout.cards.map((layoutCard) => {
        const isSelected = context.selected ? context.selected === layoutCard.personId : layoutCard.personId === context.subject;
        const personLabel = context.getPersonLabel?.(layoutCard.person, layoutCard.personId) ?? layoutCard.personId;
        const treeCardProps: FamilyCardProps<Person> = {
          person: layoutCard.person,
          personId: layoutCard.personId,
          relation: layoutCard.relation,
          selected: isSelected,
          focused: isSelected,
          collapsed: context.collapsedIds.has(layoutCard.personId),
          readOnly: context.readOnly,
          className: cardClassName,
          onAddRelationship:
            context.readOnly || !context.onAddRelationship
              ? undefined
              : () => context.onAddRelationship?.(layoutCard.person, layoutCard.personId),
          "aria-selected": isSelected,
          "aria-label": `${personLabel}, ${layoutCard.relation.label}${isSelected ? ", selected" : ""}`,
          "data-focused": isSelected ? "" : undefined,
          "data-family-card": "",
          "data-tree-card": "",
          "data-person-id": layoutCard.personId,
          "data-relation": layoutCard.relation.label,
          "data-generation": layoutCard.relation.generation,
          "data-selected": isSelected ? "" : undefined,
          "data-side": layoutCard.relation.side,
          onClick: context.onPersonClick ? () => handleFamilyClick(layoutCard.person, layoutCard.personId) : undefined,
          onKeyDown: context.onPersonClick
            ? (event) => handleFamilyKeyDown(event, layoutCard.person, layoutCard.personId)
            : undefined,
          role: context.onPersonClick ? "button" : undefined,
          tabIndex: context.onPersonClick ? 0 : undefined,
        };
        const extraCardProps =
          typeof cardProps === "function" ? cardProps(layoutCard.person, treeCardProps) : cardProps;
        const resolvedCardProps = {
          ...extraCardProps,
          ...treeCardProps,
        } as FamilyCardProps<Person> & CardExtraProps;

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
              <Card {...resolvedCardProps} />
            </div>
          </div>
        );
      })}
    </>
  );
}
