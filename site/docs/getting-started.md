# Getting Started

`@memoir/tree` provides React primitives for family trees, org charts, and generic relationship graphs.

The package keeps persistence, routing, styling, auth, and data fetching in the host app. The library focuses on:

- Normalizing relationship facts.
- Computing subject-relative family labels.
- Measuring custom cards.
- Rendering automatic layouts and SVG edges.
- Traversing generic relationship graphs.

## Install

```bash
bunx jsr add @memoir/tree
```

## Minimal Family Tree

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import type { FamilyCardProps } from "@memoir/tree";

const people = {
  alex: { id: "alex", name: "Alex" },
  morgan: { id: "morgan", name: "Morgan" },
  casey: { id: "casey", name: "Casey" },
  jordan: { id: "jordan", name: "Jordan" },
  riley: { id: "riley", name: "Riley" },
};

const relationships = [
  rel.parents("alex", ["morgan", "casey"]),
  rel.partner("alex", "jordan"),
  rel.children(["alex", "jordan"], ["riley"]),
];

function PersonCard({ person, relation, ...props }: FamilyCardProps<(typeof people)[string]>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
    </article>
  );
}

export function Page() {
  return <FamilyTree subject="alex" people={people} relationships={relationships} card={PersonCard} />;
}
```

## Minimal Org Chart

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

export function Page() {
  return <RelationshipChart nodes={nodes} relationships={relationships} rootId="lead" mode="all" />;
}
```

## Styling

Use normal CSS against stable data attributes:

```css
[data-family-card] {
  border: 1px solid currentColor;
  border-radius: 16px;
  padding: 12px 16px;
}

[data-family-card][data-relation="self"] {
  border-width: 2px;
}

[data-family-edge] {
  color: #94a3b8;
}
```
