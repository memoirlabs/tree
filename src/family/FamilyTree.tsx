"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { TreeSurface } from "./TreeSurface";
import { useCardMeasurements } from "./use-card-measurements";
import type { FamilyCardProps, FamilyTreeProps, PersonId } from "./types";

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

const defaultRelationStyle: CSSProperties = {
  display: "block",
  color: "var(--tree-muted-fg, currentColor)",
  fontSize: "0.8rem",
  lineHeight: 1.2,
};

const defaultBadgeStyle: CSSProperties = {
  display: "block",
  padding: "2px 7px",
  border: "var(--tree-outline-width, 1px) solid currentColor",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
};

function getDefaultPersonLabel<Person>(person: Person, personId: PersonId): string {
  if (!isRecord(person)) return personId;
  if (typeof person.name === "string") return person.name;
  if (typeof person.label === "string") return person.label;

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

export function DefaultFamilyCard<Person>({
  person,
  personId,
  relation,
  selected,
  focused: _focused,
  collapsed: _collapsed,
  ...props
}: FamilyCardProps<Person>): JSX.Element {
  const profileImage = getDefaultProfileImage(person);

  return (
    <article {...props} style={{ ...defaultCardStyle, ...(selected ? defaultSelectedCardStyle : {}), ...props.style }}>
      {profileImage ? <img alt="" src={profileImage} style={defaultAvatarStyle} /> : null}
      <strong style={defaultNameStyle}>{getDefaultPersonLabel(person, personId)}</strong>
      <small style={defaultRelationStyle}>{relation.label}</small>
      {selected ? <span style={defaultBadgeStyle}>selected</span> : null}
    </article>
  );
}

export function FamilyTree<Person>({
  subject,
  people,
  relationships,
  card: Card = DefaultFamilyCard,
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
}: FamilyTreeProps<Person>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);

  const unmeasuredLayout = useMemo(
    () =>
      buildFamilyTreeLayout({
        subject,
        people,
        relationships,
        lineShape,
        spacing,
      }),
    [lineShape, people, relationships, spacing, subject],
  );
  const measureKey = unmeasuredLayout.cards.map((card) => card.personId).join("|");
  const measurements = useCardMeasurements(containerRef, measureKey);

  const layout = useMemo(
    () =>
      buildFamilyTreeLayout({
        subject,
        people,
        relationships,
        measurements,
        lineShape,
        spacing,
      }),
    [lineShape, measurements, people, relationships, spacing, subject],
  );

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
      treeType="family"
    >
      <div
        ref={containerRef}
        data-family-canvas
        data-family-tree
        data-family-interaction={interactionMode}
        data-family-subject={subject}
      >
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
              data-tree-edge
              data-edge-kind={edge.kind}
              data-edge-status={edge.status}
              data-family-edge
              data-source-id={edge.sourceId}
              data-target-id={edge.targetId}
              fill="none"
              stroke="currentColor"
              strokeDasharray={
                edge.kind === "adoptive" || edge.kind === "guardian" || edge.status === "former" ? "4 4" : undefined
              }
              strokeLinecap={lineShape === "curved" ? "round" : "butt"}
              strokeLinejoin={lineShape === "curved" ? "round" : "miter"}
              strokeWidth={2}
            />
          ))}
        </svg>

        {layout.cards.map((layoutCard) => {
          const isSelected = selected ? selected === layoutCard.personId : layoutCard.personId === subject;
          const cardProps: FamilyCardProps<Person> = {
            person: layoutCard.person,
            personId: layoutCard.personId,
            relation: layoutCard.relation,
            selected: isSelected,
            focused: false,
            collapsed: collapsedIds.has(layoutCard.personId),
            className: cardClassName,
            "aria-selected": isSelected,
            "data-family-card": "",
            "data-tree-card": "",
            "data-person-id": layoutCard.personId,
            "data-relation": layoutCard.relation.label,
            "data-generation": layoutCard.relation.generation,
            "data-side": layoutCard.relation.side,
            onClick: onPersonClick ? () => handlePersonClick(layoutCard.person, layoutCard.personId) : undefined,
          };

          return (
            <div
              key={layoutCard.personId}
              data-family-card-positioner
              data-tree-card-positioner
              data-person-id={layoutCard.personId}
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
      </div>
    </TreeSurface>
  );
}
