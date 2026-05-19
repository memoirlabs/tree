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
  gap: "var(--tree-card-gap, 6px)",
  justifyItems: "center",
  minWidth: 140,
  padding: "var(--tree-card-padding, 10px 12px)",
  border: "var(--tree-outline-width, 1px) solid var(--tree-card-border, currentColor)",
  borderRadius: "var(--tree-card-radius, 0)",
  background: "var(--tree-card-bg, Canvas)",
  boxShadow: "var(--tree-card-shadow, none)",
  color: "var(--tree-card-fg, inherit)",
  textAlign: "center",
};

const defaultSelectedCardStyle: CSSProperties = {
  background: "var(--tree-card-selected-bg, var(--tree-card-bg, Canvas))",
  borderColor: "var(--tree-card-selected-border, var(--tree-card-border, currentColor))",
  color: "var(--tree-card-selected-fg, var(--tree-card-fg, inherit))",
};

const defaultAvatarStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: "var(--tree-outline-width, 1px) solid var(--tree-card-border, currentColor)",
  borderRadius: "var(--tree-profile-radius, 0)",
  background: "var(--tree-profile-bg, transparent)",
  objectFit: "cover",
};

const defaultNameStyle: CSSProperties = {
  display: "block",
  fontSize: "0.98rem",
  lineHeight: 1.1,
};

const defaultMetaStyle: CSSProperties = {
  display: "block",
  color: "var(--tree-muted-fg, currentColor)",
  fontSize: "0.78rem",
  lineHeight: 1.2,
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

function getDefaultProfileImage<Person>(person: Person): string | undefined {
  if (!isRecord(person)) return undefined;
  if (typeof person.avatar === "string") return person.avatar;
  if (typeof person.image === "string") return person.image;

  const profile = person.profile;
  if (!isRecord(profile)) return undefined;
  if (typeof profile.avatar === "string") return profile.avatar;
  if (typeof profile.image === "string") return profile.image;
  if (typeof profile.photo === "string") return profile.photo;

  return undefined;
}

function getReportLabel(count: number): string {
  return count === 1 ? "1 report" : `${count} reports`;
}

function getDefaultOrgMeta<Person>(person: Person, generation: number, directReportCount: number): string {
  const reportLabel = getReportLabel(directReportCount);

  if (isRecord(person)) {
    if (typeof person.role === "string") return `${person.role} - ${reportLabel}`;
    if (typeof person.title === "string") return `${person.title} - ${reportLabel}`;
  }

  return generation === 0 ? `root - ${reportLabel}` : `generation ${generation} - ${reportLabel}`;
}

export function DefaultOrgChartCard<Person>({
  person,
  personId,
  depth: _depth,
  generation,
  focused: _focused,
  collapsed: _collapsed,
  directReports,
  managerId: _managerId,
  selected: _selected,
  ...props
}: OrgChartCardProps<Person>): JSX.Element {
  const profileImage = getDefaultProfileImage(person);

  return (
    <article {...props} style={{ ...defaultCardStyle, ...(_selected ? defaultSelectedCardStyle : {}), ...props.style }}>
      {profileImage ? <img alt="" src={profileImage} style={defaultAvatarStyle} /> : null}
      <strong style={defaultNameStyle}>{getDefaultOrgLabel(person, personId)}</strong>
      <small style={defaultMetaStyle}>{getDefaultOrgMeta(person, generation, directReports.length)}</small>
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
  lineShape = "orthogonal",
  spacing,
  theme,
  selected,
  collapsed,
  onPersonClick,
}: OrgChartProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);

  const unmeasuredLayout = useMemo(
    () => buildOrgChartLayout({ nodes, rootId, lineShape, spacing }),
    [lineShape, nodes, rootId, spacing],
  );
  const measureKey = unmeasuredLayout.cards.map((card) => card.personId).join("|");
  const measurements = useCardMeasurements(containerRef, measureKey);

  const layout = useMemo(
    () =>
      buildOrgChartLayout({
        nodes,
        rootId,
        measurements,
        lineShape,
        spacing,
      }),
    [lineShape, measurements, nodes, rootId, spacing],
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
      theme={theme}
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
              strokeLinecap={lineShape === "curved" ? "round" : "butt"}
              strokeLinejoin={lineShape === "curved" ? "round" : "miter"}
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
            generation: layoutCard.generation,
            selected: isSelected,
            focused: false,
            collapsed: collapsedIds.has(layoutCard.personId),
            directReports: layoutCard.directReports,
            className: cardClassName,
            "aria-selected": isSelected,
            "data-depth": layoutCard.depth,
            "data-generation": layoutCard.generation,
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
