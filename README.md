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
- Or describe family trees and org charts with a small Mermaid-like text syntax.
- Render org charts from a nested reporting tree or flat `{ id, person, parentId }` nodes.
- Start with the built-in `DefaultFamilyCard`, then swap in any React card component.
- Get computed labels like `self`, `parent`, `sibling`, `half-sibling`, `partner`, `grandparent`, and `grandchild`.
- Compose lower-level primitives when the default wrapper is not enough.
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

The same surface contract applies to `OrgChart`.

## Declarative Tree Syntax

For demos, docs, tests, or user-authored diagrams, parse compact visual syntax into the same props:

```tsx
import { FamilyTree, createFamilyTree } from "@memoir/tree";

const family = createFamilyTree(`
subject henry
carol["Carol"] + james["James"] -> henry["Henry"]
henry + emma["Emma"] -> ava["Ava"]
`);

export function Page() {
  return <FamilyTree {...family} />;
}
```

The syntax is intentionally small:

```txt
subject henry
parentA["Parent A"] + parentB["Parent B"] -> child["Child"]
partnerA + partnerB : spouse
guardian["Guardian"] -> child : guardian
```

Use the same idea for org charts:

```tsx
import { OrgChart, createOrgTree } from "@memoir/tree";

const org = createOrgTree(`
root avery
avery["Avery", role="CEO"] -> morgan["Morgan", role="Product"] + casey["Casey", role="Engineering"]
casey -> river["River", role="Web"]
`);

export function Page() {
  return <OrgChart {...org} />;
}
```

By default, parsed people include `{ id, name, label, profile.display }` plus any inline attributes. If your app owns a different data shape, map nodes while parsing:

```ts
const family = createFamilyTree(source, {
  person: (node) => ({
    id: node.id,
    displayName: node.name,
  }),
});
```

## Component Primitives

Use `FamilyTree` and `OrgChart` for normal apps. Drop to primitives when you need to own the render layers while keeping Memoir Tree's layout, measuring, and panning behavior:

```tsx
import { TreeCanvas, TreeEdges, TreeNodeLayer, TreeProvider } from "@memoir/tree";

export function Page() {
  return (
    <TreeProvider type="family" subject="henry" people={people} relationships={relationships}>
      <TreeCanvas>
        <TreeEdges />
        <TreeNodeLayer card={PersonCard} />
      </TreeCanvas>
    </TreeProvider>
  );
}
```

The same primitives work for org charts:

```tsx
<TreeProvider type="org" nodes={nodes} rootId="ceo">
  <TreeCanvas interactionMode="scroll">
    <TreeEdges />
    <TreeNodeLayer card={OrgPersonCard} />
  </TreeCanvas>
</TreeProvider>
```

`useTreeLayout()` exposes the computed cards, edges, bounds, and tree type for fully custom renderers.

## Org Chart API

For the simplest org chart API, describe who reports to who with `createOrgChart`. Each `reports` array is the next generation.

```tsx
import { OrgChart, createOrgChart } from "@memoir/tree";
import type { OrgChartCardProps } from "@memoir/tree";

type Person = {
  name: string;
  role: string;
};

const chart = createOrgChart({
  id: "ceo",
  person: { name: "Avery", role: "CEO" },
  reports: [
    {
      id: "eng",
      person: { name: "Morgan", role: "Engineering" },
      reports: [{ id: "platform", person: { name: "Casey", role: "Platform" } }],
    },
    { id: "design", person: { name: "Riley", role: "Design" } },
  ],
});
```

`createOrgChart` returns the exact props `OrgChart` needs, plus easy metadata:

```ts
chart.rootId;
// "ceo"

chart.nodes;
// [
//   { id: "ceo", person: { name: "Avery", role: "CEO" }, parentId: null, order: 0 },
//   { id: "eng", person: { name: "Morgan", role: "Engineering" }, parentId: "ceo", order: 0 },
//   { id: "platform", person: { name: "Casey", role: "Platform" }, parentId: "eng", order: 0 },
//   { id: "design", person: { name: "Riley", role: "Design" }, parentId: "ceo", order: 1 },
// ]

chart.generations;
// [
//   { generation: 0, personIds: ["ceo"], count: 1 },
//   { generation: 1, personIds: ["eng", "design"], count: 2 },
//   { generation: 2, personIds: ["platform"], count: 1 },
// ]

chart.maxGeneration;
// 2

chart.reportLines;
// [
//   { managerId: "ceo", reportId: "eng" },
//   { managerId: "eng", reportId: "platform" },
//   { managerId: "ceo", reportId: "design" },
// ]
```

Render it by spreading the returned object:

```tsx
function OrgPersonCard({
  collapsed: _collapsed,
  depth: _depth,
  directReports,
  focused: _focused,
  generation,
  managerId: _managerId,
  person,
  personId: _personId,
  selected: _selected,
  ...props
}: OrgChartCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>
        {person.role} - generation {generation} - {directReports.length} reports
      </small>
    </article>
  );
}

export function Page() {
  return <OrgChart {...chart} card={OrgPersonCard} />;
}
```

If your data already comes from a database as flat rows, you can still pass `nodes` directly.

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

For the intended Memoir surface, card, and edge styling, import the optional stylesheet. It uses sharp corners, square outlined profile images, 1px black outlines, white and cream surfaces, and the Memoir orange accent:

```tsx
import "@memoir/tree/styles.css";
```

The helpers produce plain relationship rows. The library computes labels and placement from those facts relative to the current `subject`.

## Styling

`FamilyTree` and `OrgChart` accept the same styling controls:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  theme={{
    surfaceBackground: "#fffdf4",
    cardRadius: 12,
    edgeWidth: 3,
    profileRadius: 999,
    accent: "#f97316",
  }}
  spacing={{ row: 140, column: 44, padding: 40 }}
  lineShape="curved"
/>
```

Use `theme="memoir"` for the default Memoir preset or `theme="system"` for neutral system colors. A theme object can pass app-owned colors, outline width, edge width, card/profile corner radius, shadows, and font family. `lineShape="orthogonal"` keeps 90-degree connector turns; `lineShape="curved"` uses curved connectors. The same theme presets and helpers are exported as `memoirTreeTheme`, `systemTreeTheme`, `treeStylePresets`, `resolveTreeTheme`, and `createTreeThemeStyle`.

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
- `TreeProvider`
- `TreeCanvas`
- `TreeEdges`
- `TreeNodeLayer`
- `useTreeLayout`
- `createFamilyTree`
- `createOrgTree`
- `createOrgChart`
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
