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
import { buildFamilyTreeLayoutFromNormalized } from "./family-layout";
import { getDefaultFamilyRelationLabel } from "./relation-labels";
import type {
  FamilyActionContext,
  FamilyGraph,
  FamilyCardProps,
  FamilyRelationship,
  FamilyTreeCardProps,
  FamilyTreePersonHandler,
  FamilyTreeProps,
  FamilyTreeRelationLabeler,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
  TreeApi,
  TreeInitialViewport,
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
  getRelationLabel?: FamilyTreeRelationLabeler<Person>;
  readOnly?: boolean;
  selected?: PersonId;
  spacing?: Partial<FamilyTreeSpacing>;
  estimatedCardSize?: FamilyTreeProps<Person>["estimatedCardSize"];
  layoutMode?: FamilyTreeProps<Person>["layoutMode"];
  layoutPolicy?: FamilyTreeProps<Person>["layoutPolicy"];
  boundsMode?: FamilyTreeProps<Person>["boundsMode"];
  shouldRenderPersonCard?: FamilyTreeProps<Person>["shouldRenderPersonCard"];
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
  getRelationLabel?: FamilyTreeRelationLabeler<Person>;
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
  initialViewport?: TreeInitialViewport;
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
  estimatedCardSize?: FamilyTreeProps<unknown>["estimatedCardSize"],
  layoutMode?: FamilyTreeProps<unknown>["layoutMode"],
  layoutPolicy?: FamilyTreeProps<unknown>["layoutPolicy"],
  boundsMode?: FamilyTreeProps<unknown>["boundsMode"],
  hasRenderPredicate?: boolean,
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
  return [
    subject,
    collapsed?.join(",") ?? "",
    layoutMode ?? "default",
    layoutPolicy?.descendantCoparents ?? "",
    layoutPolicy?.subjectPartnerPlacement ?? "",
    boundsMode ?? "subject",
    hasRenderPredicate ?? false,
    `${estimatedCardSize?.width ?? ""}x${estimatedCardSize?.height ?? ""}`,
    relationshipKey,
  ].join("::");
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
  getRelationLabel,
  limits,
  onAddRelationship,
  onPersonClick,
  readOnly = false,
  selected,
  spacing,
  estimatedCardSize,
  layoutMode = "default",
  layoutPolicy,
  boundsMode = "subject",
  shouldRenderPersonCard,
}: FamilyTreeProviderProps<Person>): JSX.Element {
  const normalized = useMemo(
    () => normalizeFamilyInput({ graph, people, relationships, subject }),
    [graph, people, relationships, subject],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layoutSpacing = useMemo(() => createLayoutSpacing(spacing), [spacing]);
  const measureKey = createMeasurementKey(
    normalized.subject,
    normalized.relationships,
    collapsed,
    estimatedCardSize,
    layoutMode,
    layoutPolicy,
    boundsMode,
    Boolean(shouldRenderPersonCard),
  );
  const measurements = useCardMeasurements(containerRef, measureKey);
  const layout = useMemo(
    () =>
      buildFamilyTreeLayoutFromNormalized({
        subject: normalized.subject,
        people: normalized.people,
        relationships: normalized.relationships,
        personMetadata: normalized.personMetadata,
        collapsed,
        measurements,
        estimatedCardSize,
        layoutMode,
        layoutPolicy,
        boundsMode,
        shouldRenderPersonCard,
        limits,
        lineShape,
        spacing: layoutSpacing,
      }),
    [
      collapsed,
      estimatedCardSize,
      layoutMode,
      layoutPolicy,
      boundsMode,
      layoutSpacing,
      limits,
      lineShape,
      measurements,
      normalized,
      shouldRenderPersonCard,
    ],
  );
  const value = useMemo<FamilyTreePrimitiveContext<Person>>(
    () => ({
      type: "family",
      collapsedIds,
      containerRef,
      layout,
      lineShape,
      getPersonLabel,
      getRelationLabel,
      onAddRelationship,
      onPersonClick,
      readOnly,
      selected,
      subject: normalized.subject,
    }),
    [
      collapsedIds,
      getPersonLabel,
      getRelationLabel,
      layout,
      lineShape,
      normalized.subject,
      onAddRelationship,
      onPersonClick,
      readOnly,
      selected,
    ],
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
  initialViewport,
  interactionMode = "pan",
  onViewportChange,
  style,
  theme,
  treeApiRef,
  viewport,
}: TreeCanvasProps): JSX.Element {
  const context = useTreeLayout();
  const visibleCards = useMemo(
    () => context.layout.cards.filter((card) => !card.hiddenCard),
    [context.layout.cards],
  );

  return (
    <CoreTreeCanvas
      anchorId={context.subject}
      bounds={context.layout.bounds}
      cards={visibleCards}
      className={className}
      ariaLabel={ariaLabel}
      containerRef={context.containerRef}
      defaultViewport={defaultViewport}
      initialViewport={initialViewport}
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
  const visibleCards = useMemo(
    () => context.layout.cards.filter((card) => !card.hiddenCard),
    [context.layout.cards],
  );
  const {
    collapsedIds,
    getPersonLabel,
    getRelationLabel,
    onAddRelationship,
    onPersonClick,
    readOnly,
    selected,
    subject,
  } = context;

  const handleFamilyClick = useCallback(
    (context: FamilyActionContext<Person>) => {
      onPersonClick?.(context.person, context.personId, context);
    },
    [onPersonClick],
  );
  const handleFamilyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, context: FamilyActionContext<Person>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onPersonClick?.(context.person, context.personId, context);
    },
    [onPersonClick],
  );

  const getCardProps = useCallback(
    (layoutCard: FamilyTreeLayoutCard<Person>) => {
      const isSelected = selected === layoutCard.personId;
      const isFocused = selected ? isSelected : layoutCard.personId === subject;
      const personLabel = getPersonLabel?.(layoutCard.person, layoutCard.personId) ?? layoutCard.personId;
      const actionContext: FamilyActionContext<Person> = {
        person: layoutCard.person,
        personId: layoutCard.personId,
        subject,
        relation: layoutCard.relation,
        placement: layoutCard.placement,
        metadata: layoutCard.metadata,
      };
      const relationLabel =
        getRelationLabel?.(actionContext) ??
        getDefaultFamilyRelationLabel(actionContext);
      const treeCardProps: FamilyCardProps<Person> = {
        person: layoutCard.person,
        personId: layoutCard.personId,
        relation: layoutCard.relation,
        metadata: layoutCard.metadata,
        placement: layoutCard.placement,
        selected: isSelected,
        focused: isFocused,
        collapsed: collapsedIds.has(layoutCard.personId),
        readOnly,
        className: cardClassName,
        onAddRelationship:
          readOnly || !onAddRelationship
            ? undefined
            : () => onAddRelationship(layoutCard.person, layoutCard.personId, actionContext),
        "aria-selected": isSelected || undefined,
        "aria-label": `${personLabel}, ${relationLabel}`,
        "data-focused": isFocused ? "" : undefined,
        "data-family-card": "",
        "data-node-kind": layoutCard.metadata?.kind,
        "data-placement-group-id": layoutCard.metadata?.groupId,
        "data-slot-role": layoutCard.metadata?.slotRole,
        "data-tree-card": "",
        "data-person-id": layoutCard.personId,
        "data-relation": layoutCard.relation.label,
        "data-generation": layoutCard.relation.generation,
        "data-selected": isSelected ? "" : undefined,
        "data-side": layoutCard.relation.side,
        onClick: onPersonClick ? () => handleFamilyClick(actionContext) : undefined,
        onKeyDown: onPersonClick
          ? (event) => handleFamilyKeyDown(event, actionContext)
          : undefined,
        role: onPersonClick ? "button" : undefined,
        tabIndex: onPersonClick ? 0 : undefined,
      };
      const extraCardProps =
        typeof cardProps === "function" ? cardProps(layoutCard.person, treeCardProps) : cardProps;
      return {
        ...extraCardProps,
        ...treeCardProps,
      } as FamilyCardProps<Person> & CardExtraProps;
    },
    [
      cardClassName,
      cardProps,
      collapsedIds,
      getPersonLabel,
      getRelationLabel,
      handleFamilyClick,
      handleFamilyKeyDown,
      onAddRelationship,
      onPersonClick,
      readOnly,
      selected,
      subject,
    ],
  );

  return (
    <CoreTreeNodeLayer<Person, FamilyTreeLayoutCard<Person>, FamilyCardProps<Person> & CardExtraProps>
      card={card}
      cards={visibleCards}
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
