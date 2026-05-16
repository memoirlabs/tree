# Memoir Tree

[![JSR](https://jsr.io/badges/@memoir/tree)](https://jsr.io/@memoir/tree)
[![JSR Score](https://jsr.io/badges/@memoir/tree/score)](https://jsr.io/@memoir/tree)
[![JSR Weekly Downloads](https://jsr.io/badges/@memoir/tree/weekly-downloads)](https://jsr.io/@memoir/tree)

React primitives for rendering family trees and generic relationship charts. Your app owns data fetching, persistence, routing, and card design. The library owns relationship normalization, subject-relative labels, measured layout, and SVG edges.

## Install

```bash
bunx jsr add @memoir/tree
```

## Family Tree

Pass people, relationship facts, a subject, and one normal card component:

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import type { FamilyCardProps } from "@memoir/tree";

type Person = {
  id: string;
  profile: {
    display: string;
    avatar?: string;
  };
};

const people: Record<string, Person> = {
  henry: { id: "henry", profile: { display: "Henry" } },
  carol: { id: "carol", profile: { display: "Carol" } },
  james: { id: "james", profile: { display: "James" } },
  emma: { id: "emma", profile: { display: "Emma" } },
  ava: { id: "ava", profile: { display: "Ava" } },
};

const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma", { relation: "spouse" }),
  rel.children(["henry", "emma"], ["ava"]),
];

function PersonCard({ person, relation, ...props }: FamilyCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.profile.display}</strong>
      <small>{relation.label}</small>
    </article>
  );
}

export function Page() {
  return (
    <FamilyTree
      subject="henry"
      people={people}
      relationships={relationships}
      card={PersonCard}
    />
  );
}
```

The card receives normal HTML props, including data attributes for styling:

```css
[data-family-card] {
  min-width: 220px;
  padding: 12px 16px;
  border: 1px solid currentColor;
  border-radius: 16px;
  background: white;
}

[data-family-card][data-relation="self"] {
  border-width: 2px;
}

[data-family-edge] {
  color: #94a3b8;
}
```

## Relationship Facts

Use helpers for small apps, demos, and tests:

```ts
rel.parents("child", ["parent-1", "parent-2"]);
rel.children(["parent-1", "parent-2"], ["child-1", "child-2"]);
rel.partner("person-1", "person-2");
rel.guardians("child", ["guardian"]);
```

You can also store and pass the plain fact rows directly. The library computes labels like `sibling`, `half-sibling`, `coparent`, `grandparent`, and `grandchild` from those facts relative to the subject.

## Generic Relationship Charts

Use `RelationshipChart` for org charts and generic graph levels:

```tsx
import { RelationshipChart } from "@memoir/tree";

const nodes = [
  { id: "ceo", label: "CEO" },
  { id: "lead", label: "Engineering Lead" },
  { id: "report", label: "Frontend Engineer" },
];

const relationships = [
  { sourceId: "ceo", targetId: "lead", type: "ceo" },
  { sourceId: "lead", targetId: "report", type: "manager" },
];

<RelationshipChart nodes={nodes} relationships={relationships} rootId="lead" mode="all" />;
```

Database-like rows are supported with `RelationshipTableRow` and `rows`.

## Public Surface

The primary exports are `FamilyTree`, `rel`, `RelationshipChart`, `buildFamilyTreeLayout`, `createFamilyIndex`, graph traversal helpers, row adapters, and their TypeScript types.
