"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { useCardMeasurements } from "./use-card-measurements";
import type { FamilyCardProps, FamilyTreeProps, PersonId } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const defaultCardStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  justifyItems: "center",
  minWidth: 124,
  padding: "8px 10px",
  textAlign: "center",
};

const defaultNameStyle: CSSProperties = {
  display: "block",
  fontSize: "0.98rem",
  lineHeight: 1.1,
};

const defaultRelationStyle: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  lineHeight: 1.2,
  opacity: 0.68,
};

const defaultBadgeStyle: CSSProperties = {
  display: "block",
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

export function DefaultFamilyCard<Person>({
  person,
  personId,
  relation,
  selected,
  focused: _focused,
  collapsed: _collapsed,
  ...props
}: FamilyCardProps<Person>): JSX.Element {
  return (
    <article {...props} style={{ ...defaultCardStyle, ...props.style }}>
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
  cardClassName,
  edgeClassName,
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
      }),
    [people, relationships, subject],
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
      }),
    [measurements, people, relationships, subject],
  );

  const handlePersonClick = useCallback(
    (person: Person, personId: PersonId) => {
      onPersonClick?.(person, personId);
    },
    [onPersonClick],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      data-family-tree
      data-family-subject={subject}
      style={{
        overflow: "auto",
        position: "relative",
      }}
    >
      <div
        data-family-canvas
        style={{
          height: layout.bounds.height,
          position: "relative",
          width: layout.bounds.width,
        }}
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
              strokeLinecap="round"
              strokeLinejoin="round"
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
    </div>
  );
}
