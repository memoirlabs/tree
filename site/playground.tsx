import { createRoot } from "react-dom/client";

import { FamilyTree, RelationshipChart } from "../src/index";
import type { AddMemberPayload, RelationshipTableRow } from "../src/index";

const schemaYaml = `
version: 1
tree:
  title: YAML Family Tree
layout:
  strategy: auto
  density: compact
connectors:
  preset: contrast
  anchors:
    verticalGapPx: 28
card:
  fields: [name, relation, status]
  className: node-box
editing:
  enabled: true
  rootRelations: [parent, sibling, spouse, former_spouse, child]
  memberRelations: [child, spouse, former_spouse]
`;

const familyRows: RelationshipTableRow[] = [
  { sourceId: "morgan", sourceLabel: "Morgan", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "casey", sourceLabel: "Casey", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "morgan", sourceLabel: "Morgan", targetId: "sam", targetLabel: "Sam", type: "parent", targetOrder: 1 },
  { sourceId: "morgan", sourceLabel: "Morgan", targetId: "taylor", targetLabel: "Taylor", type: "parent", targetOrder: 3 },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "jordan", targetLabel: "Jordan", type: "spouse" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "riley", targetLabel: "Riley", type: "parent", targetOrder: 1 },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "quinn", targetLabel: "Quinn", type: "parent", targetOrder: 2 },
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

const handleAddMember = (payload: AddMemberPayload) => {
  console.log("playground add member", payload);
};

function Playground() {
  return (
    <main className="playground">
      <section className="section">
        <h1>Memoir Tree Playground</h1>
        <p>Local-only visual harness. This folder is not exported by the package.</p>
      </section>

      <section className="section" data-playground-section="family">
        <h2>YAML Family Tree</h2>
        <div className="tree-frame">
          <FamilyTree relationshipRows={familyRows} rootId="alex" schemaYaml={schemaYaml} onAddMember={handleAddMember} />
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
        <RelationshipChart
          rows={orgRows}
          rootId="ceo"
          mode="downstream"
          className="relationship-chart"
        />
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(<Playground />);
