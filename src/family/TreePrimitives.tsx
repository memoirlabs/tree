"use client";

import type { ComponentType, CSSProperties, JSX, ReactNode, RefObject } from "react";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { buildOrgChartLayout } from "./org-layout";
import { TreeSurface } from "./TreeSurface";
import { useCardMeasurements } from "./use-card-measurements";
import type {
  FamilyCardProps,
  FamilyTreePersonHandler,
  FamilyRelationship,
  FamilyTreeProps,
  FamilyTreeSpacing,
  OrgChartCardProps,
  OrgChartNode,
  OrgChartProps,
  PeopleById,
  PersonId,
  TreeInteractionMode,
} from "./types";
import type { FamilyTreeLayoutResult } from "./layout";
import type { OrgChartLayoutResult } from "./org-layout";
import type { TreeLineShape, TreeStylePreset, TreeTheme } from "./theme";

export type TreePrimitiveType = "family" | "org";

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

export interface OrgTreeProviderProps<Person> {
  type: "org";
  nodes: OrgChartNode<Person>[];
  children: ReactNode;
  collapsed?: PersonId[];
  lineShape?: TreeLineShape;
  onPersonClick?: OrgChartProps<Person>["onPersonClick"];
  rootId?: PersonId;
  selected?: PersonId;
  spacing?: Partial<FamilyTreeSpacing>;
}

export type TreeProviderProps<Person> = FamilyTreeProviderProps<Person> | OrgTreeProviderProps<Person>;

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

export interface OrgTreePrimitiveContext<Person> {
  type: "org";
  collapsedIds: Set<PersonId>;
  containerRef: RefObject<HTMLDivElement | null>;
  layout: OrgChartLayoutResult<Person>;
  lineShape: TreeLineShape;
  onPersonClick?: OrgChartProps<Person>["onPersonClick"];
  selected?: PersonId;
  subject?: PersonId;
}

export type TreePrimitiveContext<Person> = FamilyTreePrimitiveContext<Person> | OrgTreePrimitiveContext<Person>;

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
  card: ComponentType<FamilyCardProps<Person>> | ComponentType<OrgChartCardProps<Person>>;
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
  return props.type === "family" ? <FamilyTreeProvider {...props} /> : <OrgTreeProvider {...props} />;
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
  const layoutSpacing = useMemo(
    () => createLayoutSpacing(spacing),
    [spacing],
  );
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

function OrgTreeProvider<Person>({
  nodes,
  children,
  collapsed,
  lineShape = "orthogonal",
  onPersonClick,
  rootId,
  selected,
  spacing,
}: OrgTreeProviderProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layoutSpacing = useMemo(
    () => createLayoutSpacing(spacing),
    [spacing],
  );
  const unmeasuredLayout = useMemo(
    () => buildOrgChartLayout({ nodes, rootId, lineShape, spacing: layoutSpacing }),
    [layoutSpacing, lineShape, nodes, rootId],
  );
  const measureKey = unmeasuredLayout.cards.map((card) => card.personId).join("|");
  const measurements = useCardMeasurements(containerRef, measureKey);
  const layout = useMemo(
    () => buildOrgChartLayout({ nodes, rootId, measurements, lineShape, spacing: layoutSpacing }),
    [layoutSpacing, lineShape, measurements, nodes, rootId],
  );
  const subject = rootId ?? layout.cards.find((card) => card.depth === 0)?.personId;
  const value = useMemo<OrgTreePrimitiveContext<Person>>(
    () => ({
      type: "org",
      collapsedIds,
      containerRef,
      layout,
      lineShape,
      onPersonClick,
      selected,
      subject,
    }),
    [collapsedIds, layout, lineShape, onPersonClick, selected, subject],
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
      treeType={context.type}
      zoom={zoom}
    >
      <div
        ref={context.containerRef}
        data-family-canvas={context.type === "family" ? "" : undefined}
        data-family-interaction={context.type === "family" ? interactionMode : undefined}
        data-family-subject={context.type === "family" ? context.subject : undefined}
        data-family-tree={context.type === "family" ? "" : undefined}
        data-org-canvas={context.type === "org" ? "" : undefined}
        data-org-chart={context.type === "org" ? "" : undefined}
        data-org-root={context.type === "org" ? context.subject : undefined}
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
      {context.layout.edges.map((edge) => {
        const isFamilyEdge = context.type === "family";
        const kind = "kind" in edge ? edge.kind : undefined;
        const status = "status" in edge ? edge.status : undefined;

        return (
          <path
            key={edge.id}
            className={edgeClassName}
            d={edge.path}
            data-edge-kind={kind}
            data-edge-status={status}
            data-family-edge={isFamilyEdge ? "" : undefined}
            data-org-edge={context.type === "org" ? "" : undefined}
            data-source-id={edge.sourceId}
            data-target-id={edge.targetId}
            data-tree-edge
            fill="none"
            stroke="currentColor"
            strokeDasharray={kind === "adoptive" || kind === "guardian" || status === "former" ? "4 4" : undefined}
            strokeLinecap={context.lineShape === "curved" ? "round" : "butt"}
            strokeLinejoin={context.lineShape === "curved" ? "round" : "miter"}
            strokeWidth="var(--tree-edge-width, 2)"
          />
        );
      })}
    </svg>
  );
}

export function TreeNodeLayer<Person>({ card: Card, cardClassName }: TreeNodeLayerProps<Person>): JSX.Element {
  const context = useTreeLayout<Person>();

  const handleFamilyClick = useCallback(
    (person: Person, personId: PersonId) => {
      if (context.type === "family") context.onPersonClick?.(person, personId);
    },
    [context],
  );
  const handleOrgClick = useCallback(
    (person: Person, personId: PersonId) => {
      if (context.type === "org") context.onPersonClick?.(person, personId);
    },
    [context],
  );

  if (context.type === "family") {
    const FamilyCard = Card as ComponentType<FamilyCardProps<Person>>;
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
                <FamilyCard {...cardProps} />
              </div>
            </div>
          );
        })}
      </>
    );
  }

  const OrgCard = Card as ComponentType<OrgChartCardProps<Person>>;
  return (
    <>
      {context.layout.cards.map((layoutCard) => {
        const isSelected = context.selected ? context.selected === layoutCard.personId : layoutCard.depth === 0;
        const cardProps: OrgChartCardProps<Person> = {
          person: layoutCard.person,
          personId: layoutCard.personId,
          managerId: layoutCard.managerId,
          depth: layoutCard.depth,
          generation: layoutCard.generation,
          selected: isSelected,
          focused: false,
          collapsed: context.collapsedIds.has(layoutCard.personId),
          directReports: layoutCard.directReports,
          className: cardClassName,
          "aria-selected": isSelected,
          "data-depth": layoutCard.depth,
          "data-generation": layoutCard.generation,
          "data-org-card": "",
          "data-person-id": layoutCard.personId,
          "data-tree-card": "",
          onClick: context.onPersonClick ? () => handleOrgClick(layoutCard.person, layoutCard.personId) : undefined,
        };

        return (
          <div
            key={layoutCard.personId}
            data-org-card-positioner
            data-person-id={layoutCard.personId}
            data-tree-card-positioner
            style={{
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translate(${layoutCard.x}px, ${layoutCard.y}px)`,
            }}
          >
            <div data-family-measure-id={layoutCard.personId}>
              <OrgCard {...cardProps} />
            </div>
          </div>
        );
      })}
    </>
  );
}
