import { StrictMode, type HTMLAttributes } from "react";
import { createRoot } from "react-dom/client";

import { FamilyTree, layoutFamilyTree, rel, type FamilyCardProps } from "../../src";
import type { FamilyLayoutResult } from "../../src";
import "../../src/styles.css";
import "./visual-check.css";

type Person = {
  name: string;
};

const people: Record<string, Person> = {
  parentA: { name: "Mara" },
  parentB: { name: "Jon" },
  subject: { name: "Ari" },
  spouse: { name: "Lee" },
  exSpouse: { name: "Noah" },
  sibling: { name: "Rin" },
  childA: { name: "June" },
  childB: { name: "Kai" },
  childC: { name: "Sol" },
  grandchild: { name: "Ira" },
};

const relationships = [
  rel.partner("parentA", "parentB", { id: "parents", relation: "spouse", status: "current" }),
  rel.children(["parentA", "parentB"], ["subject", "sibling"], { id: "siblings" }),
  rel.partner("subject", "spouse", { id: "current-spouse", relation: "spouse", status: "current" }),
  rel.partner("subject", "exSpouse", { id: "former-spouse", relation: "spouse", status: "divorced" }),
  rel.children(["subject", "spouse"], ["childA", "childB"], { id: "children" }),
  rel.children(["subject", "exSpouse"], ["childC"], { id: "former-children" }),
  rel.children(["childA"], ["grandchild"], { id: "grandchild" }),
];

const enginePeople: Record<string, Person> = {
  alex: { name: "Alex" },
  jordan: { name: "Jordan" },
  morgan: { name: "Morgan" },
  riley: { name: "Riley" },
  casey: { name: "Casey" },
  drew: { name: "Drew" },
  blair: { name: "Blair" },
  unknownParent: { name: "Unknown" },
};

const engineLayout = layoutFamilyTree<Person>({
  people: enginePeople,
  center: "alex",
  unions: [
    { id: "u_alex_jordan", partners: ["alex", "jordan"], children: ["riley", "casey"], order: 1 },
    { id: "u_alex_morgan", partners: ["alex", "morgan"], children: ["drew"], order: 2 },
    { id: "u_multi", partners: ["alex", "blair", "unknownParent"], children: [], order: 3, status: "unknown" },
  ],
  options: {
    personSize: { width: 138, height: 72 },
    unionSize: { width: 18, height: 18 },
    spacing: { rank: 104, person: 28, union: 42, padding: 28 },
  },
});

function CheckCard({ person, relation, ...props }: FamilyCardProps<Person>) {
  const cardProps = props as HTMLAttributes<HTMLElement>;
  const relationshipLabel = relation.label === "self" ? "you" : relation.label;

  return (
    <article
      {...cardProps}
      style={{
        alignItems: "center",
        display: "grid",
        gap: 3,
        height: 52,
        justifyItems: "center",
        minWidth: 96,
        padding: "7px 10px",
        textAlign: "center",
        ...cardProps.style,
      }}
    >
      <strong>{person.name}</strong>
      <small>{relationshipLabel}</small>
    </article>
  );
}

function EngineLayoutPanel({ result }: { result: FamilyLayoutResult<Person> }) {
  const width = Math.max(1, result.bounds.maxX + 28);
  const height = Math.max(1, result.bounds.maxY + 28);

  return (
    <section className="engine-panel" aria-label="New layout engine visual check">
      <div className="engine-panel__header">
        <h2>New layout engine direct render</h2>
        <pre>
          {JSON.stringify(
            {
              bounds: result.bounds,
              edges: result.edges.length,
              people: result.people.length,
              unions: result.unions.length,
              warnings: result.warnings.map((warning) => warning.code),
            },
            null,
            2,
          )}
        </pre>
      </div>
      <div className="engine-stage" style={{ height, width }}>
        <svg aria-hidden="true" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
          {result.edges.map((edge) => (
            <path
              key={edge.id}
              className="engine-edge"
              d={edge.path}
              data-kind={edge.kind}
              data-relation={edge.relation}
              data-status={edge.status}
            />
          ))}
        </svg>
        {result.unions.map((node) => (
          <div
            key={node.id}
            className="engine-union"
            data-status={node.status}
            style={{
              height: node.height,
              transform: `translate(${node.x}px, ${node.y}px)`,
              width: node.width,
            }}
            title={node.id}
          />
        ))}
        {result.people.map((node) => (
          <article
            key={node.id}
            className="engine-person"
            data-hidden={node.hidden ? "" : undefined}
            data-synthetic={node.synthetic ? "" : undefined}
            style={{
              height: node.height,
              transform: `translate(${node.x}px, ${node.y}px)`,
              width: node.width,
            }}
          >
            <strong>{node.data.name}</strong>
            <small>{node.id}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  return (
    <main>
      <header>
        <h1>@memoir/tree isolated visual check</h1>
      </header>
      <EngineLayoutPanel result={engineLayout} />
      <FamilyTree
        ariaLabel="Family tree visual routing check"
        card={CheckCard}
        className="check-tree"
        defaultViewport={{ x: 0, y: 0 }}
        initialViewport="subject"
        interactionMode="pan"
        people={people}
        relationships={relationships}
        subject="subject"
        style={{ height: 760, width: 860 }}
        theme="memoir"
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
