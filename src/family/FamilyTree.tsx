"use client";

import type { JSX } from "react";
import { useCallback, useMemo, useRef } from "react";

import { buildFamilyTreeLayout } from "./layout";
import { useCardMeasurements } from "./use-card-measurements";
import type { FamilyCardProps, FamilyTreeProps, PersonId } from "./types";

export function FamilyTree<Person>({
  subject,
  people,
  relationships,
  card: Card,
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
