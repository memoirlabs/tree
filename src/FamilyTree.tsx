"use client";

import type { JSX } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { buildFamilyTreeLayout } from "./layout";
import type { FamilyCardProps, FamilyTreeProps, FamilyTreeSize, PersonId } from "./types";

const measurementsEqual = (
  a: Record<PersonId, FamilyTreeSize>,
  b: Record<PersonId, FamilyTreeSize>,
) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key]?.width === b[key]?.width && a[key]?.height === b[key]?.height);
};

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
  const [measurements, setMeasurements] = useState<Record<PersonId, FamilyTreeSize>>({});
  const collapsedIds = useMemo(() => new Set(collapsed ?? []), [collapsed]);

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

  const measureKey = layout.cards.map((card) => card.personId).join("|");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let frameId: number | null = null;

    const readMeasurements = () => {
      const nextMeasurements: Record<PersonId, FamilyTreeSize> = {};
      const elements = container.querySelectorAll<HTMLElement>("[data-family-measure-id]");
      for (const element of elements) {
        const personId = element.dataset.familyMeasureId;
        if (!personId) continue;
        const rect = element.getBoundingClientRect();
        nextMeasurements[personId] = {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        };
      }
      setMeasurements((current) => (measurementsEqual(current, nextMeasurements) ? current : nextMeasurements));
    };

    const scheduleRead = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(readMeasurements);
    };

    const observer = new ResizeObserver(scheduleRead);
    const elements = container.querySelectorAll<HTMLElement>("[data-family-measure-id]");
    for (const element of elements) {
      observer.observe(element);
    }

    readMeasurements();
    window.addEventListener("resize", scheduleRead);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", scheduleRead);
    };
  }, [measureKey]);

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
