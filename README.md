<p align="center">
  <img src="./public/logo-transparent.png" alt="Memoir Tree logo" width="760" />
</p>

<h1 align="center">Memoir Tree</h1>

<p align="center">
  Ergonomic React family trees and org charts.
</p>

[![JSR](https://jsr.io/badges/@memoir/tree)](https://jsr.io/@memoir/tree)
[![JSR Score](https://jsr.io/badges/@memoir/tree/score)](https://jsr.io/@memoir/tree)
[![JSR Weekly Downloads](https://jsr.io/badges/@memoir/tree/weekly-downloads)](https://jsr.io/@memoir/tree)

`@memoir/tree` is a focused React library for rendering subject-centered family trees and org charts. Give it your app-owned records and one normal card component. It handles measured layout, SVG edges, and a shared clipped drag-panning surface.

## Why

Most tree UIs force your app into a specific data model or a fixed card design. Memoir Tree stays small: your app owns the data, your app owns the card markup, and the library handles layout, measurement, and viewport behavior.

## Features

- Bring your own person shape.
- Describe family facts with `rel.parents`, `rel.children`, `rel.partner`, and `rel.guardians`.
- Render org charts from flat `{ id, person, parentId }` nodes.
- Start with the built-in `DefaultFamilyCard`, then swap in any React card component.
- Get computed labels like `self`, `parent`, `sibling`, `half-sibling`, `partner`, `grandparent`, and `grandchild`.
- Style with stable data attributes instead of a bundled theme.
- Use pure indexing and layout helpers in tests, previews, or custom renderers.

## Install

```bash
bunx jsr add @memoir/tree
```

## Usage

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import type { FamilyCardProps } from "@memoir/tree";
import "@memoir/tree/styles.css";

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

For a quick first render, omit `card`. The built-in default card displays `name`, `label`, `profile.display`, or the person ID:

```tsx
<FamilyTree subject="henry" people={people} relationships={relationships} />
```

`FamilyTree` owns its viewport defaults. It fills the parent width, inherits parent height when available, falls back to a usable minimum height, clips overflow, and supports drag-panning horizontally and vertically without requiring wrapper CSS. Use `style`, `className`, or `interactionMode="scroll"` only when a host app wants a different container contract.

The same surface contract applies to `OrgChart`:

```tsx
import { OrgChart } from "@memoir/tree";

const nodes = [
  { id: "ceo", person: { name: "Avery", role: "CEO" } },
  { id: "eng", person: { name: "Morgan", role: "Engineering" }, parentId: "ceo" },
  { id: "design", person: { name: "Riley", role: "Design" }, parentId: "ceo" },
];

export function Page() {
  return <OrgChart nodes={nodes} />;
}
```

## Relationship Facts

Use helpers for examples, tests, demos, and small apps:

```ts
const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma", { relation: "spouse" }),
  rel.children(["henry", "emma"], ["ava"]),
  rel.guardians("ava", ["pat"]),
];
```

For the intended default surface, card, and edge styling, import the optional stylesheet:

```tsx
import "@memoir/tree/styles.css";
```

The helpers produce plain relationship rows. The library computes labels and placement from those facts relative to the current `subject`.

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

## Public Surface

The public API is intentionally small:

- `FamilyTree`
- `DefaultFamilyCard`
- `OrgChart`
- `DefaultOrgChartCard`
- `TreeSurface`
- `rel`
- `FamilyCardProps`
- `FamilyTreeProps`
- `OrgChartCardProps`
- `OrgChartProps`
- family relationship types
- `createFamilyIndex`
- `collectFamilyNeighborhood`
- `buildFamilyTreeLayout`
- `buildOrgChartLayout`

## Local Development

```bash
bun run typecheck
bun test
bun run build
bun run site
```

`bun run site` starts the local Next.js/Fumadocs site in `site/`.

## License

MIT
