<h1 align="center">Memoir Tree</h1>

<p align="center">
  Lightweight React family trees and org charts.
</p>

[![npm](https://img.shields.io/npm/v/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)
[![npm downloads](https://img.shields.io/npm/dw/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)

`@memoir/tree` renders relationship-aware trees from your app-owned data. You provide people, flat relationship facts, and optional custom cards. The package handles measured layout, SVG edges, panning, accessibility props, and a small CSS-variable skin.

It is not a graph editor, database, or form system. Your app keeps ownership of persistence, permissions, routing, editing flows, and card markup.

<p align="center">
  <img src="https://raw.githubusercontent.com/memoirlabs/tree/main/public/logo.png" alt="Memoir Labs Tree" width="720" />
</p>

## Install

```bash
bun add @memoir/tree
```

Requires React 19. Import the stylesheet once when you want the default Memoir skin:

```tsx
import "@memoir/tree/styles.css";
```

## Family Tree

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import "@memoir/tree/styles.css";

const people = {
  alex: { id: "alex", name: "Alex" },
  morgan: { id: "morgan", name: "Morgan" },
  casey: { id: "casey", name: "Casey" },
  jordan: { id: "jordan", name: "Jordan" },
  riley: { id: "riley", name: "Riley" },
};

const relationships = [
  rel.parents("alex", ["morgan", "casey"]),
  rel.partner("alex", "jordan", { relation: "spouse" }),
  rel.children(["alex", "jordan"], ["riley"]),
];

export function FamilyPanel() {
  return <FamilyTree people={people} subject="alex" relationships={relationships} />;
}
```

## Org Chart

```tsx
import { OrgChart, org } from "@memoir/tree";
import "@memoir/tree/styles.css";

const people = {
  ceo: { id: "ceo", name: "Casey", title: "CEO" },
  eng: { id: "eng", name: "Morgan", title: "VP Engineering" },
  design: { id: "design", name: "Riley", title: "Design Lead" },
};

const relationships = [
  org.reports("ceo", ["eng", "design"]),
];

export function TeamChart() {
  return <OrgChart people={people} root="ceo" relationships={relationships} />;
}
```

## Custom Cards

Most apps should bring their own card component. Spread the provided props onto the card root so data attributes, ARIA props, click handlers, and keyboard handlers reach the DOM.

```tsx
import type { FamilyCardProps } from "@memoir/tree";

function ProfileCard({ focused, person, relation, ...rootProps }: FamilyCardProps<Person>) {
  return (
    <article {...rootProps}>
      <strong>{person.name}</strong>
      <small>{focused && relation.label === "self" ? "root node" : relation.label}</small>
    </article>
  );
}

<FamilyTree people={people} subject="alex" relationships={relationships} card={ProfileCard} />;
```

Use `cardProps` when your card needs app-owned typed props.

## Styling

The stylesheet is framework-free CSS using stable data attributes and CSS variables. Do not import it from JavaScript automatically; consumers opt in explicitly.

```tsx
<FamilyTree
  className="my-tree"
  people={people}
  subject="alex"
  relationships={relationships}
/>
```

```css
.my-tree {
  --tree-canvas-bg: #fff7df;
  --tree-card-bg: #ffffff;
  --tree-card-border: #17120f;
  --tree-card-shadow: 5px 5px 0 #17120f;
  --tree-edge: #17120f;
}
```

## Public Surface

- Components: `FamilyTree`, `OrgChart`, `DefaultFamilyCard`, `StyledFamilyCard`, `DefaultOrgCard`
- Relationship helpers: `rel`, `org`
- Family helpers: `createFamilyIndex`, `collectFamilyNeighborhood`, `defaultFamilyNeighborhoodLimits`, `buildFamilyTreeLayout`
- Org helpers: `createOrgChartIndex`, `collectOrgChartSubtree`, `buildOrgChartLayout`
- Family primitives: `TreeProvider`, `TreeCanvas`, `TreeEdges`, `TreeNodeLayer`, `useTreeLayout`
- Shared viewport/types: `TreeSurface`, `TreeApi`, `TreeViewport`, card prop and relationship types
- Stylesheet: `@memoir/tree/styles.css`

## Local Development

```bash
bun run typecheck
bun test
bun run build
bun run lint
bun run --cwd site ci
```

## Release

```bash
bun run release:dry-run
bun run release
```

Releases are manual. `bun run release` checks the package, writes `RELEASE_ANNOUNCEMENT.md`, publishes to npm, tags the release, pushes the tag, and creates a GitHub Release.

## License

MIT
