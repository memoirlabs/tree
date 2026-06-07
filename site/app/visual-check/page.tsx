"use client";

import {
  FamilyTree,
  OrgChart,
  rel,
  type FamilyCardProps,
  type FamilyGraph,
  type OrgCardProps,
  type OrgChartGraph,
} from "../../../src/index";
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
    </main>
  );
}
