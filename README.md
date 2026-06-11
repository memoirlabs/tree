<h1 align="center">@memoir/tree</h1>

<p align="center">
  Lightweight React family trees and org charts from app-owned data.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@memoir/tree">
    <img src="https://img.shields.io/npm/v/%40memoir%2Ftree" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@memoir/tree">
    <img src="https://img.shields.io/npm/dw/%40memoir%2Ftree" alt="npm downloads" />
  </a>
</p>

`@memoir/tree` renders relationship-aware family trees and org charts. Your app owns the records, persistence, editing flows, routing, permissions, and custom card markup. Tree handles measured layout, relationship edges, viewport behavior, accessibility props, and a tiny CSS-variable skin.

It is not a graph editor, database, form builder, auth system, or React Flow replacement. It is a focused renderer for family and org tree UIs.

<p align="center">
  <img src="https://raw.githubusercontent.com/memoirlabs/tree/main/public/logo.png" alt="Memoir Tree" width="720" />
</p>

## Install

```bash
bun add @memoir/tree
```

React is a peer dependency. Import the stylesheet once when you want the default Memoir skin:

```tsx
import "@memoir/tree/styles.css";
```

## Family Trees

Use graph mode for real family apps. The graph is plain app-owned state:

- `people`: records keyed by person ID.
- `subject`: the person to center.
- `partnershipGroups`: spouse, partner, co-parent, or unknown-parent groups.
- `parentChildLinks`: one parent-to-child lineage link per parent.
- `guardianshipLinks`: optional caregiver links that are not parentage.

```tsx
import { FamilyTree, type FamilyGraph } from "@memoir/tree";
import "@memoir/tree/styles.css";

type Person = {
  id: string;
  name: string;
};

const graph: FamilyGraph<Person> = {
  people: {
    alex: { id: "alex", name: "Alex" },
    jordan: { id: "jordan", name: "Jordan" },
    riley: { id: "riley", name: "Riley" },
  },
  subject: "riley",
  partnershipGroups: [
    { id: "alex-jordan", partners: ["alex", "jordan"], relation: "spouse" },
  ],
  parentChildLinks: [
    { id: "alex-riley", groupId: "alex-jordan", parentId: "alex", childId: "riley" },
    { id: "jordan-riley", groupId: "alex-jordan", parentId: "jordan", childId: "riley" },
  ],
};

export function FamilyPanel() {
  return <FamilyTree graph={graph} />;
}
```

Children attach to the correct union through `groupId`. A child with links from Alex and Jordan using `groupId: "alex-jordan"` renders from that parent group, not from one arbitrary parent card. Parentage by itself does not imply that the parents are spouses or partners; draw a spouse, partner, or co-parent bar only by adding the corresponding `partnershipGroups` record.

## Add Family Members

Because the graph is normal React state, editing is just an immutable state update. Update the graph, pass it back into `FamilyTree`, and React re-renders the tree.

```tsx
import { useState } from "react";
import { FamilyTree, type FamilyGraph } from "@memoir/tree";

type Person = {
  id: string;
  name: string;
};

export function EditableFamilyTree({ initialGraph }: { initialGraph: FamilyGraph<Person> }) {
  const [graph, setGraph] = useState(initialGraph);

  function addChild() {
    const childId = crypto.randomUUID();
    const groupId = "alex-jordan";

    setGraph((current) => ({
      ...current,
      people: {
        ...current.people,
        [childId]: { id: childId, name: "New child" },
      },
      parentChildLinks: [
        ...current.parentChildLinks,
        { id: `alex-${childId}`, groupId, parentId: "alex", childId, relation: "biological" },
        { id: `jordan-${childId}`, groupId, parentId: "jordan", childId, relation: "biological" },
      ],
    }));
  }

  return (
    <>
      <button type="button" onClick={addChild}>
        Add child
      </button>
      <FamilyTree graph={graph} />
    </>
  );
}
```

Save the same graph shape to your database. Keep `id`, `groupId`, and `order` values stable for clean JSON diffs and predictable re-renders.

For add-member flows, let the app decide which relation choices are allowed for the selected person. Helpers such as `getFamilyPartnershipGroupIds(graph, personId)`, `getFamilyChildBearingGroupIds(graph, personId)`, and `getFamilyChildPlacementGroupIds(graph, personId)` can identify the relevant union IDs for custom editors.

## Model Real Relationships

Multiple unions stay separate:

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

Per-parent lineage stays truthful:

```ts
parentChildLinks: [
  {
    id: "alex-riley",
    groupId: "alex-jordan",
    parentId: "alex",
    childId: "riley",
    relation: "biological",
  },
  {
    id: "jordan-riley",
    groupId: "alex-jordan",
    parentId: "jordan",
    childId: "riley",
    relation: "step",
  },
];
```

Links with the same `groupId`, `relation`, `status`, and `order` are grouped into one rendered parentage relationship. Links with different lineage kinds, such as biological plus step, stay distinct.

For one rendered tree, each person appears once. If graph traversal reaches the same person through multiple paths, direct roles win over lateral roles: self, parents/guardians, children, partners/coparents, siblings, then broader lateral relatives. That prevents a parent or partner from also rendering as a sibling just because another parentage path can reach them.

Guardianship is separate from parentage:

```ts
guardianshipLinks: [
  { id: "morgan-riley-guardian", guardianId: "morgan", childId: "riley", relation: "guardian" },
];
```

Unknown parent placeholders are display facts. A partnership with `relation: "unknown"` or `status: "unknown"` renders the placeholder without drawing a spouse bar. If the unknown person is also a co-parent, include a `parentChildLink` for that placeholder.

## Simple Family Mode

For small examples, simple relationship helpers are still available:

```tsx
import { FamilyTree, rel } from "@memoir/tree";

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

Use graph mode when you need stable IDs, multiple unions, per-parent lineage, guardianship, unknown parents, or clean persisted diffs.

## Org Charts

Org charts can use simple helper relationships:

```tsx
import { OrgChart, org } from "@memoir/tree";
import "@memoir/tree/styles.css";

const people = {
  ceo: { id: "ceo", name: "Casey", title: "CEO" },
  eng: { id: "eng", name: "Morgan", title: "VP Engineering" },
  design: { id: "design", name: "Riley", title: "Design Lead" },
};

const relationships = [
  org.manager("ceo", ["eng", "design"]),
];

export function TeamChart() {
  return <OrgChart people={people} root="ceo" relationships={relationships} />;
}
```

Use org graph mode when reporting edges need stable app-owned IDs:

```tsx
import { OrgChart, type OrgChartGraph } from "@memoir/tree";

const graph: OrgChartGraph<Person> = {
  people,
  root: "ceo",
  reportingLinks: [
    { id: "ceo-eng", managerId: "ceo", reportId: "eng", relation: "manager", status: "current", order: 1 },
    { id: "ceo-design", managerId: "ceo", reportId: "design", relation: "direct", status: "former", order: 2 },
  ],
};

export function TeamChart() {
  return <OrgChart graph={graph} />;
}
```

## Custom Cards

Most apps should provide their own card component. Spread the supplied props onto the card root so ARIA props, keyboard handlers, click handlers, and stable data attributes reach the DOM.

```tsx
import type { FamilyCardProps } from "@memoir/tree";

function ProfileCard({ person, relation, ...rootProps }: FamilyCardProps<Person>) {
  return (
    <article {...rootProps}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
    </article>
  );
}

<FamilyTree graph={graph} card={ProfileCard} />;
```

Use `cardProps` for typed app-owned inputs:

```tsx
<FamilyTree
  graph={graph}
  card={ProfileCard}
  cardProps={(person) => ({
    href: `/people/${person.id}`,
    canEdit: currentUserCanEdit,
  })}
/>
```

## Layout And Viewport

Family layout is subject-centered and neighborhood-based. It renders ancestor rows, a subject row with siblings and partners, and descendant rows. Partnership groups and child groups participate in layout before SVG edges are routed, so parent-child lines come from measured card positions.

Large families can become wide. Use `limits` to control the visible neighborhood:

```tsx
<FamilyTree
  graph={graph}
  limits={{ ancestorGenerations: 3, descendantGenerations: 2, partners: null }}
/>
```

Default family layout keeps lateral expansion off. Set `lateralFamilyGenerations` above `0` when you want the renderer to include immediate lateral branches that already exist in the graph, such as parent siblings, cousins, and nieces/nephews. Those groups have explicit caps through `auntsUncles`, `cousins`, and `niecesNephews`; set any cap to `null` to disable it.

Default family spacing leaves room for union-centered edges while keeping canvas padding small:

```ts
{ row: 104, column: 40, padding: 24 }
```

Override spacing only when your card design needs a different density:

```tsx
<FamilyTree graph={graph} spacing={{ row: 72, column: 20, padding: 24 }} />
```

The default `interactionMode` is `"pan"`. Users can drag the canvas or non-interactive card surfaces with mouse, touch, or pen. Use `"pan-page-scroll"` when vertical touch should scroll the page, `"scroll"` for native scrollbars, or `"none"` for a static tree.

`treeApiRef` exposes a small viewport API:

- `centerPerson(personId)`
- `fitToSubject()`
- `resetViewport()`

## Styling

The stylesheet is framework-free CSS with variables and stable data attributes. The package never auto-imports CSS.

```tsx
<FamilyTree className="my-tree" graph={graph} />
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

Useful selectors include:

- `[data-tree-surface]`
- `[data-tree-card]`
- `[data-tree-edge]`
- `[data-family-card]`
- `[data-family-edge]`
- `[data-org-card]`
- `[data-org-edge]`
- `[data-selected]`
- `[data-focused]`

## React-Free Layout

Use `buildFamilyTreeLayout()` when you need the same family layout data without rendering React components. Pass measurements from your own renderer and receive positioned cards, SVG paths, and bounds.

```ts
import { buildFamilyTreeLayout } from "@memoir/tree";

const layout = buildFamilyTreeLayout({
  graph,
  measurements: {
    alex: { width: 180, height: 72 },
    jordan: { width: 180, height: 72 },
    riley: { width: 160, height: 68 },
  },
});
```

Use `buildLayeredTreeLayout()` only when you need the small shared measured-box layout primitive. `FamilyTree` and `OrgChart` are the main domain renderers.

## Public Surface

All supported root exports are documented in the site API reference.

- Components: `FamilyTree`, `OrgChart`, `DefaultFamilyCard`, `StyledFamilyCard`, `DefaultOrgCard`
- Family primitives: `TreeProvider`, `TreeCanvas`, `TreeEdges`, `TreeNodeLayer`, `useTreeLayout`
- Relationship helpers: `rel`, `org`
- Graph converters: `graphToFamilyRelationships`, `graphToOrgReportingRelationships`
- Family model helpers: `createFamilyIndex`, `collectFamilyNeighborhood`, `defaultFamilyNeighborhoodLimits`
- Family graph helpers: `getFamilyPartnershipGroupIds`, `getFamilyChildBearingGroupIds`, `getFamilyChildPlacementGroupIds`
- React-free layout helpers: `buildFamilyTreeLayout`, `buildOrgChartLayout`, `buildLayeredTreeLayout`
- Advanced family layout service: `createFamilyLayoutService`, `layoutFamilyTree`, `createUnionParentLinks`, `defaultFamilyLayoutOptions`, `resolveFamilyLayoutOptions`
- Org model helpers: `createOrgChartIndex`, `collectOrgChartSubtree`
- Core surface and styling helpers: `TreeSurface`, `treeStylePresets`, `getTreeStyleName`
- Public types: graph types, relationship types, component prop types, card prop types, layout result types, primitive prop types, viewport types, styling types, and helper option types
- Stylesheet: `@memoir/tree/styles.css`

The package does not expose a generic graph editor API. The lower-level exports exist so apps can compose family render layers, run tests without React, or bridge older family layout data into the current graph model.

## Development

```bash
bun run typecheck
bun test
bun run build
bun run lint
bun run --cwd site ci
```

## License

MIT
