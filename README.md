# Memoir Tree

[![JSR](https://jsr.io/badges/@memoir/tree)](https://jsr.io/@memoir/tree)
[![JSR Score](https://jsr.io/badges/@memoir/tree/score)](https://jsr.io/@memoir/tree)
[![JSR Weekly Downloads](https://jsr.io/badges/@memoir/tree/weekly-downloads)](https://jsr.io/@memoir/tree)

A focused React family tree library. Give it people, semantic relationships, a subject, and one normal card component. It handles relationship normalization, kinship labels, measured layout, generation placement, and SVG edges.

## Install

```bash
bunx jsr add @memoir/tree
```

## Usage

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
  return <FamilyTree subject="henry" people={people} relationships={relationships} card={PersonCard} />;
}
```

## Styling

The card receives normal HTML props and stable data attributes:

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

Use helpers for examples, tests, demos, and small apps:

```ts
rel.parents("child", ["parent-1", "parent-2"]);
rel.children(["parent-1", "parent-2"], ["child-1", "child-2"]);
rel.partner("person-1", "person-2");
rel.guardians("child", ["guardian"]);
```

The library computes labels like `sibling`, `half-sibling`, `coparent`, `grandparent`, and `grandchild` from those facts relative to the subject.

## Public Surface

The public API is intentionally small: `FamilyTree`, `rel`, family relationship types, `FamilyCardProps`, `FamilyTreeProps`, and the pure family indexing/layout helpers.
