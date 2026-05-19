"use client";

import { FamilyTree, OrgChart, rel } from "../../src/index";
import type { FamilyCardProps, OrgChartCardProps } from "../../src/index";

type Person = {
  id: string;
  name: string;
  note?: string;
};

const people: Record<string, Person> = {
  ruth: { id: "ruth", name: "Ruth", note: "grandparent" },
  morgan: { id: "morgan", name: "Morgan", note: "parent" },
  casey: { id: "casey", name: "Casey", note: "parent" },
  alex: { id: "alex", name: "Alex", note: "subject" },
  sam: { id: "sam", name: "Sam", note: "sibling" },
  taylor: { id: "taylor", name: "Taylor", note: "half-sibling" },
  jordan: { id: "jordan", name: "Jordan", note: "partner" },
  riley: { id: "riley", name: "Riley", note: "child" },
  quinn: { id: "quinn", name: "Quinn", note: "child" },
  river: { id: "river", name: "River", note: "grandchild" },
};

const familyRelationships = [
  rel.parents("morgan", ["ruth"]),
  rel.parents("alex", ["morgan", "casey"]),
  rel.parents("sam", ["morgan", "casey"]),
  rel.parents("taylor", ["morgan"]),
  rel.partner("alex", "jordan", { relation: "spouse" }),
  rel.children(["alex", "jordan"], ["riley", "quinn"]),
  rel.children(["riley"], ["river"]),
];

const orgNodes = [
  { id: "ceo", person: { id: "ceo", name: "Avery", note: "CEO" } },
  { id: "eng", person: { id: "eng", name: "Morgan", note: "Engineering" }, parentId: "ceo" },
  { id: "design", person: { id: "design", name: "Riley", note: "Design" }, parentId: "ceo" },
  { id: "web", person: { id: "web", name: "Casey", note: "Web" }, parentId: "eng" },
  { id: "data", person: { id: "data", name: "Quinn", note: "Data" }, parentId: "eng" },
];

function PersonCard({
  person,
  relation,
  selected: _selected,
  personId: _personId,
  focused: _focused,
  collapsed: _collapsed,
  ...props
}: FamilyCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{person.note ?? relation.label}</small>
    </article>
  );
}

function OrgPersonCard({
  person,
  depth: _depth,
  selected: _selected,
  personId: _personId,
  focused: _focused,
  collapsed: _collapsed,
  directReports: _directReports,
  managerId: _managerId,
  ...props
}: OrgChartCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{person.note}</small>
    </article>
  );
}

export function Playground() {
  return (
    <div className="tree-frame">
      <div className="tree-example">
        <p className="tree-example-label">FamilyTree</p>
        <FamilyTree
          subject="alex"
          people={people}
          relationships={familyRelationships}
          card={PersonCard}
          cardClassName="name-node"
          className="landing-tree-surface"
          edgeClassName="family-edge"
          interactionMode="scroll"
          style={{ height: 820 }}
        />
      </div>
      <div className="tree-example">
        <p className="tree-example-label">OrgChart</p>
        <OrgChart
          nodes={orgNodes}
          card={OrgPersonCard}
          cardClassName="name-node"
          className="landing-tree-surface"
          edgeClassName="family-edge"
          interactionMode="scroll"
          style={{ height: 540 }}
        />
      </div>
    </div>
  );
}
