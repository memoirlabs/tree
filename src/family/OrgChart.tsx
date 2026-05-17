"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useMemo, useRef } from "react";

import { buildOrgChartLayout } from "./org-layout";
import { TreeSurface } from "./TreeSurface";
import { useCardMeasurements } from "./use-card-measurements";
import type { OrgChartCardProps, OrgChartProps, PersonId } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const defaultCardStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  justifyItems: "center",
  minWidth: 140,
  padding: "10px 12px",
  textAlign: "center",
};

const defaultNameStyle: CSSProperties = {
  display: "block",
  fontSize: "0.98rem",
  lineHeight: 1.1,
};

const defaultMetaStyle: CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  lineHeight: 1.2,
  opacity: 0.68,
};

function getDefaultOrgLabel<Person>(person: Person, personId: PersonId): string {
  if (!isRecord(person)) return personId;
  if (typeof person.name === "string") return person.name;
  if (typeof person.label === "string") return person.label;
  if (typeof person.title === "string") return person.title;

  const profile = person.profile;
  if (isRecord(profile) && typeof profile.display === "string") return profile.display;

  return personId;
}

function getDefaultOrgMeta<Person>(person: Person, depth: number): string {
  if (isRecord(person)) {
    if (typeof person.role === "string") return person.role;
    if (typeof person.title === "string") return person.title;
  }

  return depth === 0 ? "root" : `level ${depth}`;
}

export function DefaultOrgChartCard<Person>({
  person,
  personId,
  depth,
  focused: _focused,
  collapsed: _collapsed,
  directReports: _directReports,
  managerId: _managerId,
  selected: _selected,
  ...props
}: OrgChartCardProps<Person>): JSX.Element {
  return (
    <article {...props} style={{ ...defaultCardStyle, ...props.style }}>
      <strong style={defaultNameStyle}>{getDefaultOrgLabel(person, personId)}</strong>
      <small style={defaultMetaStyle}>{getDefaultOrgMeta(person, depth)}</small>
    </article>
  );
}

export function OrgChart<Person>({
  nodes,
  rootId,
  card: Card = DefaultOrgChartCard,
  className,
  style,
  cardClassName,
  edgeClassName,
  interactionMode = "pan",
  selected,
  collapsed,
  onPersonClick,
}: OrgChartProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);

  const unmeasuredLayout = useMemo(() => buildOrgChartLayout({ nodes, rootId }), [nodes, rootId]);
  const measureKey = unmeasuredLayout.cards.map((card) => card.personId).join("|");
  const measurements = useCardMeasurements(containerRef, measureKey);

  const layout = useMemo(
    () =>
      buildOrgChartLayout({
        nodes,
        rootId,
        measurements,
      }),
    [measurements, nodes, rootId],
  );

  const subject = rootId ?? layout.cards.find((card) => card.depth === 0)?.personId;

  const handlePersonClick = useCallback(
    (person: Person, personId: PersonId) => {
      onPersonClick?.(person, personId);
    },
    [onPersonClick],
  );

  return (
    <TreeSurface
      bounds={layout.bounds}
      className={className}
      interactionMode={interactionMode}
      style={style}
      subject={subject}
      treeType="org"
    >
      <div ref={containerRef} data-org-canvas data-org-chart data-org-root={subject}>
        <svg
          aria-hidden="true"
          width={layout.bounds.width}
          height={layout.bounds.height}
          viewBox={`0 0 ${layout.bounds.width} ${layout.bounds.height}`}
          fill="none"
          style={{
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
            position: "absolute",
          }}
        >
          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              className={edgeClassName}
              d={edge.path}
              data-org-edge
              data-source-id={edge.sourceId}
              data-target-id={edge.targetId}
              data-tree-edge
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          ))}
        </svg>

        {layout.cards.map((layoutCard) => {
          const isSelected = selected ? selected === layoutCard.personId : layoutCard.depth === 0;
          const cardProps: OrgChartCardProps<Person> = {
            person: layoutCard.person,
            personId: layoutCard.personId,
            managerId: layoutCard.managerId,
            depth: layoutCard.depth,
            selected: isSelected,
            focused: false,
            collapsed: collapsedIds.has(layoutCard.personId),
            directReports: layoutCard.directReports,
            className: cardClassName,
            "aria-selected": isSelected,
            "data-depth": layoutCard.depth,
            "data-org-card": "",
            "data-person-id": layoutCard.personId,
            "data-tree-card": "",
            onClick: onPersonClick ? () => handlePersonClick(layoutCard.person, layoutCard.personId) : undefined,
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
                <Card {...cardProps} />
              </div>
            </div>
          );
        })}
      </div>
    </TreeSurface>
  );
}
