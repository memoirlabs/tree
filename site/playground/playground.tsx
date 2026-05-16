import { createRoot } from "react-dom/client";

import { FamilyTree, RelationshipChart, rel } from "../../src/index";
import type { FamilyCardProps, RelationshipTableRow } from "../../src/index";

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

const orgRows: RelationshipTableRow[] = [
  { sourceId: "ceo", sourceLabel: "CEO", targetId: "vp-product", targetLabel: "VP Product", type: "ceo" },
  { sourceId: "ceo", sourceLabel: "CEO", targetId: "vp-eng", targetLabel: "VP Eng", type: "ceo" },
  { sourceId: "vp-product", sourceLabel: "VP Product", targetId: "design-lead", targetLabel: "Design Lead", type: "manager" },
  { sourceId: "vp-eng", sourceLabel: "VP Eng", targetId: "eng-lead", targetLabel: "Eng Lead", type: "manager" },
  { sourceId: "eng-lead", sourceLabel: "Eng Lead", targetId: "frontend", targetLabel: "Frontend", type: "manager" },
  { sourceId: "eng-lead", sourceLabel: "Eng Lead", targetId: "backend", targetLabel: "Backend", type: "manager" },
  { sourceId: "assistant", sourceLabel: "Assistant", targetId: "ceo", targetLabel: "CEO", type: "assistant" },
];

function PersonCard({ person, relation, selected, ...props }: FamilyCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
      {person.note ? <span>{person.note}</span> : null}
      {selected ? <em>selected</em> : null}
    </article>
  );
}

function Playground() {
  return (
    <main className="playground">
      <section className="section">
        <h1>Memoir Tree Playground</h1>
        <p>Local-only visual harness. This folder is not exported by the package.</p>
      </section>

      <section className="section" data-playground-section="family">
        <h2>Ergonomic Family Tree</h2>
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

      <section className="section" data-playground-section="org">
        <h2>Org Chart: Upstream / Downstream</h2>
        <RelationshipChart
          rows={orgRows}
          rootId="eng-lead"
          mode="auto"
          className="relationship-chart"
          renderNode={(node, options) => (
            <div data-root={options.isRoot}>
              <strong>{node.label}</strong>
              <div>depth {options.depth}</div>
            </div>
          )}
        />
      </section>

      <section className="section" data-playground-section="downstream">
        <h2>CEO Downstream</h2>
        <RelationshipChart rows={orgRows} rootId="ceo" mode="downstream" className="relationship-chart" />
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(<Playground />);
