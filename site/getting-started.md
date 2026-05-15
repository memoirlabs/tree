# Getting Started

`@memoir/tree` provides unstyled React primitives for family trees, org charts,
and generic relationship graphs.

The package keeps persistence, routing, styling, and data fetching in the host app.
The library focuses on:

- Rendering relationship-aware family layouts.
- Parsing validated YAML UI schemas.
- Traversing generic relationship graphs.
- Rendering simple unstyled relationship chart levels.

## Install

```bash
bunx jsr add @memoir/tree
```

## Minimal Family Tree

```tsx
import { FamilyTree } from "@memoir/tree";
import type { FamilyMember } from "@memoir/tree";

const rootMember: FamilyMember = {
  id: "alex",
  name: "Alex",
  parents: [{ id: "morgan", name: "Morgan" }],
  siblings: [{ id: "sam", name: "Sam" }],
  spouse: { id: "jordan", name: "Jordan" },
  children: [{ id: "riley", name: "Riley" }],
};

export function Page() {
  return <FamilyTree rootMember={rootMember} />;
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

The default output is intentionally plain. Use `className`, `cardConfig.className`,
or custom `renderNode` callbacks to apply your own design system.
