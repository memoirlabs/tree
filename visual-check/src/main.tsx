import { StrictMode, type HTMLAttributes } from "react";
import { createRoot } from "react-dom/client";

import { FamilyTree, rel, type FamilyCardProps } from "../../src";
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

function App() {
  return (
    <main>
      <header>
        <h1>@memoir/tree isolated visual check</h1>
      </header>
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
