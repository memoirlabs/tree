"use client";

import { FamilyTree, rel } from "../../src/index";
import type { FamilyCardProps } from "../../src/index";

type DemoProfile = {
  id: string;
  name: string;
  role: string;
  tone?: "cream" | "orange" | "yellow";
};

const profiles: Record<string, DemoProfile> = {
  maren: { id: "maren", name: "Maren", role: "grandparent", tone: "yellow" },
  june: { id: "june", name: "June", role: "parent" },
  ellis: { id: "ellis", name: "Ellis", role: "parent" },
  noa: { id: "noa", name: "Noa", role: "subject", tone: "orange" },
  sol: { id: "sol", name: "Sol", role: "spouse", tone: "yellow" },
  river: { id: "river", name: "River", role: "child" },
};

const relationships = [
  rel.parents("june", ["maren"]),
  rel.parents("noa", ["june", "ellis"]),
  rel.partner("noa", "sol", { relation: "spouse" }),
  rel.children(["noa", "sol"], ["river"]),
];

function DemoProfileCard({
  collapsed: _collapsed,
  focused: _focused,
  onAddRelationship: _onAddRelationship,
  person,
  personId: _personId,
  readOnly: _readOnly,
  relation,
  ...props
}: FamilyCardProps<DemoProfile>) {
  return (
    <article {...props} className={`memoir-demo-card memoir-demo-card--${person.tone ?? "cream"}`}>
      <strong>{person.name}</strong>
      <small>{person.role}</small>
      <span>{relation.label === "self" ? "root node" : relation.label}</span>
    </article>
  );
}

export function SimpleFamilyTreeDemo() {
  return (
    <FamilyTree
      people={profiles}
      relationships={relationships}
      subject="noa"
      card={DemoProfileCard}
      className="memoir-demo-surface"
      edgeClassName="memoir-demo-edge"
      interactionMode="pan"
      readOnly
      spacing={{ column: 40, padding: 36, row: 118 }}
      style={{ height: "100%" }}
    />
  );
}
