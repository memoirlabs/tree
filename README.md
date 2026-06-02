<h1 align="center">Tree</h1>

<p align="center">
  Lightweight React family trees and org charts.
</p>

[![npm](https://img.shields.io/npm/v/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)
[![npm downloads](https://img.shields.io/npm/dw/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)

`@memoir/tree` renders relationship-aware trees from your app-owned data. You provide people, family graph facts or simple relationship helpers, and optional custom cards. The package handles measured layout, SVG edges, panning, accessibility props, and a small CSS-variable skin.

It is not a graph editor, database, permission system, invite flow, router, or form system. Your app keeps ownership of persistence, permissions, routing, editing flows, data validation, and card markup.

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

### Simple mode

Simple mode uses the `rel` helpers. It is good for small examples and simple trees, but it flattens parentage into relationship rows.

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

### Graph mode

Graph mode is recommended for production family-tree apps. It models partnership groups, per-parent child lineage, guardianship, and people who participate in multiple unions.

```tsx
import { FamilyTree, type FamilyGraph } from "@memoir/tree";
import "@memoir/tree/styles.css";

const graph: FamilyGraph<Person> = {
  people,
  subject: "riley",
  partnershipGroups: [
    { id: "alex-jordan", partners: ["alex", "jordan"], relation: "spouse" },
  ],
  parentChildLinks: [
    { id: "alex-riley", groupId: "alex-jordan", parentId: "alex", childId: "riley", relation: "biological" },
    { id: "jordan-riley", groupId: "alex-jordan", parentId: "jordan", childId: "riley", relation: "biological" },
  ],
};

export function FamilyPanel() {
  return <FamilyTree graph={graph} />;
}
```

### Multiple unions / blended family

Children are attached to the group that produced or raised that child, so multiple spouse or co-parent groups do not collapse into one mixed union.

```ts
const graph: FamilyGraph<Person> = {
  people,
  subject: "alex",
  partnershipGroups: [
    { id: "alex-jordan", partners: ["alex", "jordan"], relation: "spouse", order: 1 },
    { id: "alex-morgan", partners: ["alex", "morgan"], relation: "coparent", status: "former", order: 2 },
  ],
  parentChildLinks: [
    { id: "alex-riley", groupId: "alex-jordan", parentId: "alex", childId: "riley" },
    { id: "jordan-riley", groupId: "alex-jordan", parentId: "jordan", childId: "riley" },
    { id: "alex-casey", groupId: "alex-morgan", parentId: "alex", childId: "casey" },
    { id: "morgan-casey", groupId: "alex-morgan", parentId: "morgan", childId: "casey" },
  ],
};
```

### Per-parent lineage

Lineage belongs to each parent-child link, not to the whole union.

```ts
const graph: FamilyGraph<Person> = {
  people,
  subject: "riley",
  partnershipGroups: [{ id: "alex-jordan", partners: ["alex", "jordan"] }],
  parentChildLinks: [
    { id: "alex-riley", groupId: "alex-jordan", parentId: "alex", childId: "riley", relation: "biological" },
    { id: "jordan-riley", groupId: "alex-jordan", parentId: "jordan", childId: "riley", relation: "step" },
  ],
};
```

### Guardianship

Guardianship is separate from parentage, so a guardian is not rendered as a biological parent unless you model that link too.

```ts
const graph: FamilyGraph<Person> = {
  people,
  subject: "riley",
  partnershipGroups: [],
  parentChildLinks: [
    { id: "alex-riley", parentId: "alex", childId: "riley", relation: "biological" },
  ],
  guardianshipLinks: [
    { id: "morgan-riley-guardian", guardianId: "morgan", childId: "riley", relation: "guardian" },
  ],
};
```

Custom family cards receive placement metadata when graph mode is used:

```ts
placement?: {
  partnershipGroupIds: string[];
  parentChildLinkIds: string[];
  guardianshipLinkIds: string[];
  visibleRelationshipIds: string[];
};
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
      <small>{relation.label}</small>
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
- Relationship helpers: `rel`, `org`; `rel.children()` and `rel.parents()` are simple-mode helpers
- Family graph helpers: `graphToFamilyRelationships`
- Family helpers: `createFamilyIndex`, `collectFamilyNeighborhood`, `defaultFamilyNeighborhoodLimits`, `buildFamilyTreeLayout`
- Org helpers: `createOrgChartIndex`, `collectOrgChartSubtree`, `buildOrgChartLayout`
- Family primitives: `TreeProvider`, `TreeCanvas`, `TreeEdges`, `TreeNodeLayer`, `useTreeLayout`
- Shared viewport/types: `TreeSurface`, `TreeApi`, `TreeInitialViewport`, `TreeViewport`, card prop and relationship types
- Stylesheet: `@memoir/tree/styles.css`

## Migrating from 0.3 to 0.4

The old `people` + `subject` + `relationships` API still works as simple mode. For real family apps, move to `graph` so partnership groups and individual parent-child or guardianship links are explicit.

Use `partnershipGroups` for spouse, partner, and co-parent clusters. Use `parentChildLinks` for each parent-to-child lineage, including biological, adoptive, step, foster, or unknown links. Use `guardianshipLinks` for guardians and foster guardians. Keep persistence IDs, permissions, invites, editing state, and validation in your app model; Tree only renders and lays out the graph you pass in.

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
