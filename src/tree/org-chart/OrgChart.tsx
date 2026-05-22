"use client";

import type { CSSProperties, JSX, KeyboardEvent } from "react";
import { useCallback, useMemo, useRef } from "react";

import { TreeCanvas, TreeEdges, TreeNodeLayer, useCardMeasurements } from "../core";
import { buildOrgChartLayout } from "./org-chart-layout";
import type { OrgCardProps, OrgChartLayoutCard, OrgChartProps, OrgRenderCardProps, PersonId } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const defaultCardStyle: CSSProperties = {
  display: "grid",
  gap: "var(--tree-card-gap, 6px)",
  justifyItems: "center",
  minWidth: 124,
  padding: "var(--tree-card-padding, 10px 12px)",
  border: "var(--tree-outline-width, 1px) solid var(--tree-card-border, currentColor)",
  borderRadius: "var(--tree-card-radius, 0)",
  background: "var(--tree-card-bg, Canvas)",
  boxShadow: "var(--tree-card-shadow, none)",
  color: "var(--tree-card-fg, inherit)",
  textAlign: "center",
};

const defaultNameStyle: CSSProperties = {
  display: "block",
  fontSize: "0.98rem",
  lineHeight: 1.1,
};

const defaultMetaStyle: CSSProperties = {
  display: "block",
  color: "var(--tree-muted-fg, currentColor)",
  fontSize: "0.8rem",
  lineHeight: 1.2,
};

function getDefaultPersonLabel<Person>(person: Person, personId: PersonId): string {
  if (!isRecord(person)) return personId;
  if (typeof person.name === "string") return person.name;
  if (typeof person.label === "string") return person.label;

  const profile = person.profile;
  if (isRecord(profile) && typeof profile.display === "string") return profile.display;

  return personId;
}

function getDefaultPersonMeta<Person>(person: Person, depth: number): string {
  if (isRecord(person)) {
    if (typeof person.title === "string") return person.title;
    if (typeof person.role === "string") return person.role;
    const profile = person.profile;
    if (isRecord(profile) && typeof profile.title === "string") return profile.title;
  }
  return depth === 0 ? "root node" : `level ${depth}`;
}

export function DefaultOrgCard<Person>({
  person,
  personId,
  depth,
  selected: _selected,
  focused: _focused,
  collapsed: _collapsed,
  readOnly: _readOnly,
  parentId: _parentId,
  ...props
}: OrgCardProps<Person>): JSX.Element {
  return (
    <article {...props} style={{ ...defaultCardStyle, ...props.style }}>
      <strong style={defaultNameStyle}>{getDefaultPersonLabel(person, personId)}</strong>
      <small style={defaultMetaStyle}>{getDefaultPersonMeta(person, depth)}</small>
    </article>
  );
}

const createMeasurementKey = (root: PersonId, relationships: OrgChartProps<unknown>["relationships"], collapsed?: PersonId[]) => {
  const relationshipKey = relationships
    .map((relationship) => `${relationship.managerId}>${relationship.reportIds.join(",")}`)
    .join("|");
  return `${root}::${collapsed?.join(",") ?? ""}::${relationshipKey}`;
};

export function OrgChart<Person, CardExtraProps extends object = Record<string, never>>({
  root,
  rootProfileId,
  people,
  profiles,
  relationships,
  ariaLabel,
  card,
  cardProps,
  renderCard,
  className,
  style,
  cardClassName,
  edgeClassName,
  interactionMode = "pan",
  lineShape = "orthogonal",
  zoom,
  defaultZoom,
  viewport,
  defaultViewport,
  onViewportChange,
  minZoom,
  maxZoom,
  onZoomChange,
  spacing,
  maxDepth,
  theme,
  treeApiRef,
  getPersonLabel,
  selected,
  collapsed,
  readOnly = false,
  onPersonClick,
}: OrgChartProps<Person, CardExtraProps>): JSX.Element {
  const resolvedRoot = root ?? rootProfileId;
  const resolvedPeople = people ?? profiles;

  if (!resolvedRoot) {
    throw new Error("OrgChart requires `root` or `rootProfileId`.");
  }
  if (!resolvedPeople) {
    throw new Error("OrgChart requires `people` or `profiles`.");
  }

  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureKey = createMeasurementKey(resolvedRoot, relationships, collapsed);
  const measurements = useCardMeasurements(containerRef, measureKey);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);
  const layout = useMemo(
    () =>
      buildOrgChartLayout({
        root: resolvedRoot,
        people: resolvedPeople,
        relationships,
        collapsed,
        measurements,
        spacing,
        maxDepth,
        lineShape,
      }),
    [collapsed, lineShape, maxDepth, measurements, relationships, resolvedPeople, resolvedRoot, spacing],
  );
  const ResolvedCard = renderCard
    ? (props: OrgCardProps<Person> & CardExtraProps) => renderCard(toOrgRenderCardProps(props))
    : (card ?? DefaultOrgCard);
  const resolvePersonLabel = getPersonLabel ?? getDefaultPersonLabel;

  const handleClick = useCallback(
    (person: Person, personId: PersonId) => {
      onPersonClick?.(person, personId);
    },
    [onPersonClick],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, person: Person, personId: PersonId) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onPersonClick?.(person, personId);
    },
    [onPersonClick],
  );

  const getCardProps = useCallback(
    (layoutCard: OrgChartLayoutCard<Person>) => {
      const isSelected = selected === layoutCard.personId;
      const isFocused = selected ? isSelected : layoutCard.personId === resolvedRoot;
      const personLabel = resolvePersonLabel(layoutCard.person, layoutCard.personId);
      const treeCardProps: OrgCardProps<Person> = {
        person: layoutCard.person,
        personId: layoutCard.personId,
        depth: layoutCard.depth,
        parentId: layoutCard.parentId,
        selected: isSelected,
        focused: isFocused,
        collapsed: collapsedIds.has(layoutCard.personId),
        readOnly,
        className: cardClassName,
        "aria-selected": isSelected || undefined,
        "aria-label": `${personLabel}, ${layoutCard.depth === 0 ? "root node" : `level ${layoutCard.depth}`}`,
        "data-depth": layoutCard.depth,
        "data-focused": isFocused ? "" : undefined,
        "data-org-card": "",
        "data-parent-id": layoutCard.parentId,
        "data-person-id": layoutCard.personId,
        "data-selected": isSelected ? "" : undefined,
        "data-tree-card": "",
        onClick: onPersonClick ? () => handleClick(layoutCard.person, layoutCard.personId) : undefined,
        onKeyDown: onPersonClick ? (event) => handleKeyDown(event, layoutCard.person, layoutCard.personId) : undefined,
        role: onPersonClick ? "button" : undefined,
        tabIndex: onPersonClick ? 0 : undefined,
      };
      const extraCardProps =
        typeof cardProps === "function" ? cardProps(layoutCard.person, treeCardProps) : cardProps;
      return {
        ...extraCardProps,
        ...treeCardProps,
      } as OrgCardProps<Person> & CardExtraProps;
    },
    [cardClassName, cardProps, collapsedIds, handleClick, handleKeyDown, onPersonClick, readOnly, resolvePersonLabel, resolvedRoot, selected],
  );

  return (
    <TreeCanvas
      anchorId={resolvedRoot}
      bounds={layout.bounds}
      cards={layout.cards}
      className={className}
      ariaLabel={ariaLabel}
      containerRef={containerRef}
      defaultViewport={defaultViewport}
      defaultZoom={defaultZoom}
      interactionMode={interactionMode}
      maxZoom={maxZoom}
      minZoom={minZoom}
      onViewportChange={onViewportChange}
      onZoomChange={onZoomChange}
      style={style}
      theme={theme}
      treeApiRef={treeApiRef}
      treeType="org-chart"
      viewport={viewport}
      zoom={zoom}
    >
      <div data-org-chart data-org-root={resolvedRoot}>
        <TreeEdges
          bounds={layout.bounds}
          edgeClassName={edgeClassName}
          edges={layout.edges}
          lineShape={lineShape}
          getEdgeProps={() => ({ "data-org-edge": "" })}
        />
        <TreeNodeLayer<Person, OrgChartLayoutCard<Person>, OrgCardProps<Person> & CardExtraProps>
          card={ResolvedCard}
          cards={layout.cards}
          getCardProps={getCardProps}
          getPositionerProps={(layoutCard) => ({
            "data-org-card-positioner": "",
            "data-depth": layoutCard.depth,
          })}
          getMeasureProps={(layoutCard) => ({
            "data-org-measure": "",
            "data-org-measure-id": layoutCard.personId,
          })}
        />
      </div>
    </TreeCanvas>
  );
}

function toOrgRenderCardProps<Person>(props: OrgCardProps<Person>): OrgRenderCardProps<Person> {
  return {
    person: props.person,
    personId: props.personId,
    depth: props.depth,
    parentId: props.parentId,
    selected: props.selected,
    focused: props.focused,
    collapsed: props.collapsed,
    readOnly: props.readOnly,
    rootProps: {
      "aria-label": props["aria-label"],
      "aria-selected": props["aria-selected"],
      className: props.className,
      "data-depth": props["data-depth"],
      "data-focused": props["data-focused"],
      "data-org-card": props["data-org-card"],
      "data-parent-id": props["data-parent-id"],
      "data-person-id": props["data-person-id"],
      "data-selected": props["data-selected"],
      "data-tree-card": props["data-tree-card"],
      onClick: props.onClick,
      onKeyDown: props.onKeyDown,
      role: props.role,
      style: props.style,
      tabIndex: props.tabIndex,
    },
  };
}
