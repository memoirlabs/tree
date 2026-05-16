"use client";

import { FamilyTree, rel } from "../../src/index";
import type { FamilyCardProps } from "../../src/index";

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

function PersonCard({
  person,
  relation,
  selected,
  personId: _personId,
  focused: _focused,
  collapsed: _collapsed,
  ...props
}: FamilyCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
      {person.note ? <span>{person.note}</span> : null}
      {selected ? <em>selected</em> : null}
    </article>
  );
}

export function Playground() {
  return (
    <div className="playground-grid">
      <section className="playground-card" data-playground-section="family">
        <div>
          <p className="eyebrow">Family tree</p>
          <h2>Subject-centered relationships</h2>
        </div>
        <div className="tree-frame">
          <FamilyTree
            subject="alex"
            people={people}
            relationships={familyRelationships}
            card={PersonCard}
            cardClassName="node-box"
            edgeClassName="family-edge"
          />
        </div>
      </section>

    </div>
  );
}
