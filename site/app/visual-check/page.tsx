"use client";

import {
  FamilyTree,
  OrgChart,
  buildFamilyTreeLayout,
  rel,
  type FamilyCardProps,
  type FamilyGraph,
  type FamilyTreeLayoutResult,
  type OrgCardProps,
  type OrgChartGraph,
} from "@memoir/tree";
import type { HTMLAttributes } from "react";

type Person = {
  name: string;
  title?: string;
};

const familyGraph: FamilyGraph<Person> = {
  people: {
    grandA: { name: "Grand A" },
    grandB: { name: "Grand B" },
    parentA: { name: "Parent A" },
    parentB: { name: "Parent B" },
    siblingA: { name: "Sibling A" },
    subject: { name: "Subject" },
    partnerLeft: { name: "Partner L" },
    partnerRight: { name: "Partner R" },
    partnerFar: { name: "Partner Far" },
    childA: { name: "Child A" },
    childB: { name: "Child B" },
    childC: { name: "Child C" },
    grandChildA: { name: "Grandchild A" },
    nieceA: { name: "Niece A" },
  },
  subject: "subject",
  partnershipGroups: [
    { id: "parents", partners: ["parentA", "parentB"], relation: "spouse", order: 1 },
    { id: "subject-partners", partners: ["partnerLeft", "subject", "partnerRight", "partnerFar"], order: 2 },
  ],
  parentChildLinks: [
    { id: "grandA-parentA", parentId: "grandA", childId: "parentA", order: 1 },
    { id: "grandB-parentA", parentId: "grandB", childId: "parentA", order: 1 },
    { id: "parentA-subject", groupId: "parents", parentId: "parentA", childId: "subject", order: 2 },
    { id: "parentB-subject", groupId: "parents", parentId: "parentB", childId: "subject", order: 2 },
    { id: "parentA-siblingA", groupId: "parents", parentId: "parentA", childId: "siblingA", order: 3 },
    { id: "parentB-siblingA", groupId: "parents", parentId: "parentB", childId: "siblingA", order: 3 },
    { id: "subject-childA", groupId: "subject-partners", parentId: "subject", childId: "childA", order: 4 },
    { id: "partnerRight-childA", groupId: "subject-partners", parentId: "partnerRight", childId: "childA", order: 4 },
    { id: "subject-childB", groupId: "subject-partners", parentId: "subject", childId: "childB", order: 5 },
    { id: "partnerFar-childB", groupId: "subject-partners", parentId: "partnerFar", childId: "childB", order: 5 },
    { id: "subject-childC", parentId: "subject", childId: "childC", order: 6 },
    { id: "childA-grandChildA", parentId: "childA", childId: "grandChildA", order: 7 },
    { id: "siblingA-nieceA", parentId: "siblingA", childId: "nieceA", order: 8 },
  ],
};

const orgGraph: OrgChartGraph<Person> = {
  people: {
    ceo: { name: "CEO", title: "Root" },
    ops: { name: "Ops", title: "VP" },
    eng: { name: "Eng", title: "VP" },
    design: { name: "Design", title: "VP" },
    web: { name: "Web", title: "Lead" },
    data: { name: "Data", title: "Lead" },
    brand: { name: "Brand", title: "Lead" },
  },
  root: "ceo",
  reportingLinks: [
    { id: "ceo-ops", managerId: "ceo", reportId: "ops", order: 1 },
    { id: "ceo-eng", managerId: "ceo", reportId: "eng", order: 2 },
    { id: "ceo-design", managerId: "ceo", reportId: "design", order: 3 },
    { id: "eng-web", managerId: "eng", reportId: "web", order: 1 },
    { id: "eng-data", managerId: "eng", reportId: "data", order: 2 },
    { id: "design-brand", managerId: "design", reportId: "brand", order: 1 },
  ],
};

const unknownPartnerPeople = {
  child: { name: "Child" },
  self: { name: "Self" },
  unknown: { name: "Unknown" },
};

const directFamilyLayout = buildFamilyTreeLayout<Person>({
  graph: familyGraph,
  limits: { lateralFamilyGenerations: 1, partners: null },
  measurements: Object.fromEntries(
    Object.keys(familyGraph.people).map((personId) => [personId, { height: 72, width: 132 }]),
  ),
  spacing: { row: 96, column: 44, padding: 48 },
});

function DirectLayoutPanel({ result }: { result: FamilyTreeLayoutResult<Person> }) {
  const width = Math.max(1, result.bounds.width);
  const height = Math.max(1, result.bounds.height);

  return (
    <section style={{ background: "#fffaf0", border: "2px solid #111", color: "#111", overflow: "auto", padding: 12 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "220px minmax(0, 1fr)", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, lineHeight: 1.2, margin: 0 }}>Direct family layout data</h2>
        <pre style={{ background: "#111", color: "#fffaf0", fontSize: 11, lineHeight: 1.35, margin: 0, overflow: "auto", padding: 8 }}>
          {JSON.stringify(
            {
              bounds: result.bounds,
              cards: result.cards.length,
              edges: result.edges.length,
            },
            null,
            2,
          )}
        </pre>
      </div>
      <div
        style={{
          background: "#fff",
          border: "1px solid #111",
          height,
          minWidth: "100%",
          position: "relative",
          width,
        }}
      >
        <svg aria-hidden="true" height={height} style={{ inset: 0, overflow: "visible", position: "absolute" }} viewBox={`0 0 ${width} ${height}`} width={width}>
          {result.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              data-kind={edge.kind}
              data-source-id={edge.sourceId}
              data-status={edge.status}
              data-target-id={edge.targetId}
              fill="none"
              stroke="#111"
              strokeWidth={2}
            />
          ))}
        </svg>
        {result.cards.map((card) => (
          <article
            key={card.personId}
            data-direct-family-card
            data-person-id={card.personId}
            style={{
              alignItems: "center",
              background: "white",
              border: "2px solid #111",
              display: "grid",
              gap: 4,
              height: card.height,
              justifyItems: "center",
              left: 0,
              padding: "8px 10px",
              position: "absolute",
              textAlign: "center",
              top: 0,
              transform: `translate(${card.x}px, ${card.y}px)`,
              width: card.width,
            }}
          >
            <strong style={{ fontSize: 14, lineHeight: 1.1 }}>{card.person.name}</strong>
            <small style={{ color: "#554b40", fontSize: 11, lineHeight: 1.1 }}>{card.relation.label}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function StressCard({ person, ...props }: { person: Person } & HTMLAttributes<HTMLElement>) {
  return (
    <article {...props} style={{ background: "white", border: "2px solid #111", minWidth: 132, padding: 12 }}>
      <strong>{person.name}</strong>
      {person.title ? <small style={{ display: "block" }}>{person.title}</small> : null}
    </article>
  );
}

function FamilyStressCard({
  collapsed: _collapsed,
  focused: _focused,
  onAddRelationship: _onAddRelationship,
  person,
  personId: _personId,
  placement: _placement,
  readOnly: _readOnly,
  relation: _relation,
  selected: _selected,
  ...props
}: FamilyCardProps<Person>) {
  return <StressCard person={person} {...props} />;
}

function OrgStressCard({
  collapsed: _collapsed,
  depth: _depth,
  focused: _focused,
  parentId: _parentId,
  person,
  personId: _personId,
  readOnly: _readOnly,
  selected: _selected,
  ...props
}: OrgCardProps<Person>) {
  return <StressCard person={person} {...props} />;
}

export default function VisualCheckPage() {
  return (
    <main style={{ background: "#111", color: "white", display: "grid", gap: 24, minHeight: "100vh", padding: 24 }}>
      <section>
        <h1 style={{ fontSize: 18, margin: 0 }}>Tree Visual Check</h1>
        <p style={{ margin: "8px 0 0" }}>Stress fixtures for family bounds, partner routing, org layout, and pan modes.</p>
      </section>
      <section style={{ height: 620 }}>
        <DirectLayoutPanel result={directFamilyLayout} />
      </section>
      <section style={{ height: 620 }}>
        <FamilyTree
          graph={familyGraph}
          card={FamilyStressCard}
          interactionMode="pan-page-scroll"
          limits={{ lateralFamilyGenerations: 1, partners: null }}
          spacing={{ row: 96, column: 44, padding: 48 }}
        />
      </section>
      <section style={{ height: 500 }}>
        <OrgChart
          graph={orgGraph}
          card={OrgStressCard}
          interactionMode="pan"
          spacing={{ row: 86, column: 36, padding: 48 }}
        />
      </section>
      <section style={{ height: 360 }}>
        <FamilyTree
          people={{
            a: { name: "A" },
            b: { name: "B" },
            c: { name: "C" },
            d: { name: "D" },
          }}
          subject="b"
          relationships={[rel.partner("a", "b"), rel.partner("b", "c"), rel.children(["b", "c"], ["d"])]}
          card={FamilyStressCard}
          interactionMode="scroll"
        />
      </section>
      <section style={{ height: 360 }}>
        <FamilyTree
          people={unknownPartnerPeople}
          subject="self"
          relationships={[
            rel.partner("self", "unknown", { relation: "unknown", status: "unknown" }),
            rel.children(["self"], ["child"]),
          ]}
          card={FamilyStressCard}
          interactionMode="pan"
        />
      </section>
    </main>
  );
}
