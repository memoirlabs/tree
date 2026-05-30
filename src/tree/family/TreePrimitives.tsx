"use client";

import type { ComponentType, CSSProperties, JSX, KeyboardEvent, ReactNode, Ref, RefObject } from "react";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

import {
  TreeCanvas as CoreTreeCanvas,
  TreeEdges as CoreTreeEdges,
  TreeNodeLayer as CoreTreeNodeLayer,
  useCardMeasurements,
} from "../core";
import { normalizeFamilyInput } from "./family-graph";
import { buildFamilyTreeLayout } from "./family-layout";
import type {
  FamilyGraph,
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
  TreeLineShape,
  TreeStylePreset,
  TreeViewport,
} from "./types";
import type { FamilyTreeLayoutCard, FamilyTreeLayoutEdge, FamilyTreeLayoutResult } from "./layout-types";

export type TreePrimitiveType = "family";

export interface FamilyTreeProviderProps<Person> {
  type: "family";
  subject?: PersonId;
  people?: PeopleById<Person>;
  relationships?: FamilyRelationship[];
  graph?: FamilyGraph<Person>;
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
  interactionMode?: TreeInteractionMode;
  onViewportChange?: (viewport: TreeViewport) => void;
  style?: CSSProperties;
  theme?: TreeStylePreset;
  treeApiRef?: Ref<TreeApi>;
  viewport?: TreeViewport;
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
  graph,
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
  const normalized = useMemo(
    () => normalizeFamilyInput({ graph, people, relationships, subject }),
    [graph, people, relationships, subject],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layoutSpacing = useMemo(() => createLayoutSpacing(spacing), [spacing]);
  const measureKey = createMeasurementKey(normalized.subject, normalized.relationships, collapsed);
  const measurements = useCardMeasurements(containerRef, measureKey);
  const layout = useMemo(
    () =>
      buildFamilyTreeLayout({
        subject: normalized.subject,
        people: normalized.people,
        relationships: normalized.relationships,
        collapsed,
        measurements,
        limits,
        lineShape,
        spacing: layoutSpacing,
      }),
    [collapsed, layoutSpacing, limits, lineShape, measurements, normalized],
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
      subject: normalized.subject,
    }),
    [collapsedIds, layout, lineShape, getPersonLabel, onAddRelationship, onPersonClick, readOnly, selected, normalized.subject],
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
  interactionMode = "pan",
  onViewportChange,
  style,
  theme,
  treeApiRef,
  viewport,
}: TreeCanvasProps): JSX.Element {
  const context = useTreeLayout();

  return (
    <CoreTreeCanvas
      anchorId={context.subject}
      bounds={context.layout.bounds}
      cards={context.layout.cards}
      className={className}
      ariaLabel={ariaLabel}
      containerRef={context.containerRef}
      defaultViewport={defaultViewport}
      interactionMode={interactionMode}
      onViewportChange={onViewportChange}
      style={style}
      theme={theme}
      treeApiRef={treeApiRef}
      treeType="family"
      viewport={viewport}
    >
      <div
        data-family-canvas
        data-family-interaction={interactionMode}
        data-family-subject={context.subject}
        data-family-tree
      >
        {children}
      </div>
    </CoreTreeCanvas>
  );
}

export function TreeEdges({ edgeClassName }: TreeEdgesProps): JSX.Element {
  const context = useTreeLayout();
  return (
    <CoreTreeEdges
      bounds={context.layout.bounds}
      edgeClassName={edgeClassName}
      edges={context.layout.edges}
      lineShape={context.lineShape}
      getEdgeProps={(edge: FamilyTreeLayoutEdge) => ({
        "data-family-edge": "",
        strokeDasharray:
          edge.kind === "adoptive" || edge.kind === "guardian" || edge.status === "former" ? "4 4" : undefined,
      })}
    />
  );
}

export function TreeNodeLayer<Person, CardExtraProps extends object = Record<string, never>>({
  card,
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

  const getCardProps = useCallback(
    (layoutCard: FamilyTreeLayoutCard<Person>) => {
      const isSelected = context.selected === layoutCard.personId;
      const isFocused = context.selected ? isSelected : layoutCard.personId === context.subject;
      const personLabel = context.getPersonLabel?.(layoutCard.person, layoutCard.personId) ?? layoutCard.personId;
      const relationLabel = isFocused && layoutCard.personId === context.subject ? "root node" : layoutCard.relation.label;
      const treeCardProps: FamilyCardProps<Person> = {
        person: layoutCard.person,
        personId: layoutCard.personId,
        relation: layoutCard.relation,
        placement: layoutCard.placement,
        selected: isSelected,
        focused: isFocused,
        collapsed: context.collapsedIds.has(layoutCard.personId),
        readOnly: context.readOnly,
        className: cardClassName,
        onAddRelationship:
          context.readOnly || !context.onAddRelationship
            ? undefined
            : () => context.onAddRelationship?.(layoutCard.person, layoutCard.personId),
        "aria-selected": isSelected || undefined,
        "aria-label": `${personLabel}, ${relationLabel}`,
        "data-focused": isFocused ? "" : undefined,
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
      return {
        ...extraCardProps,
        ...treeCardProps,
      } as FamilyCardProps<Person> & CardExtraProps;
    },
    [cardClassName, cardProps, context, handleFamilyClick, handleFamilyKeyDown],
  );

  return (
    <CoreTreeNodeLayer<Person, FamilyTreeLayoutCard<Person>, FamilyCardProps<Person> & CardExtraProps>
      card={card}
      cards={context.layout.cards}
      getCardProps={getCardProps}
      getPositionerProps={() => ({
        "data-family-card-positioner": "",
      })}
      getMeasureProps={(layoutCard) => ({
        "data-family-measure": "",
        "data-family-measure-id": layoutCard.personId,
      })}
    />
  );
}
