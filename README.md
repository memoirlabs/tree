<h1 align="center">Memoir Tree</h1>

<p align="center">
  Ergonomic React family trees.
</p>

[![npm](https://img.shields.io/npm/v/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)
[![npm downloads](https://img.shields.io/npm/dw/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)

`@memoir/tree` is a focused React library for rendering subject-centered family trees. Give it your app-owned records and one normal card component. It handles measured layout, SVG edges, pan, zoom, and card placement.

## Why

Most tree UIs force your app into a specific data model or a fixed card design. Memoir Tree stays small: your app owns the data, permissions, mutations, and card markup; the library handles layout, measurement, connectors, and viewport behavior.

## Features

- Bring your own profile shape.
- Describe family facts with `rel.parents`, `rel.children`, `rel.partner`, and `rel.guardians`.
- Start with the built-in `DefaultFamilyCard`, then swap in any React card component.
- Get computed labels like `self`, `parent`, `sibling`, `half-sibling`, `partner`, `grandparent`, and `grandchild`.
- Compose lower-level primitives when the default wrapper is not enough.
- Style with stable data attributes, CSS variables, or the `theme` prop.
- Use pure indexing and layout helpers in tests, previews, or custom renderers.

## Install

```bash
bun add @memoir/tree
```

## Usage

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import type { FamilyCardProps } from "@memoir/tree";
import "@memoir/tree/styles.css";

type Profile = {
  id: string;
  profile: {
    display: string;
    avatar?: string;
  };
};

const profiles: Record<string, Profile> = {
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

function ProfileCard({
  collapsed: _collapsed,
  focused: _focused,
  onAddRelationship: _onAddRelationship,
  person,
  personId: _personId,
  readOnly: _readOnly,
  relation,
  selected,
  ...props
}: FamilyCardProps<Profile>) {
  return (
    <article {...props} className="memoir-profile-card">
      <strong>{person.profile.display}</strong>
      <small>{selected ? "selected" : relation.label}</small>
    </article>
  );
}

export function Page() {
  return (
    <FamilyTree
      profiles={profiles}
      relationships={relationships}
      rootProfileId="henry"
      renderProfileCard={(_profile, props) => <ProfileCard {...props} />}
    />
  );
}
```

For a quick first render, omit `renderProfileCard`. The built-in default card displays `name`, `label`, `profile.display`, or the profile ID:

```tsx
<FamilyTree profiles={profiles} rootProfileId="henry" relationships={relationships} />
```

`FamilyTree` owns its viewport defaults. It fills the parent width, inherits parent height when available, falls back to a usable minimum height, clips overflow, and supports drag-panning and zooming without requiring wrapper CSS. Use `style`, `className`, `zoom`, or `interactionMode="scroll"` when a host app wants a different container contract.

## Component Primitives

Use `FamilyTree` for normal apps. Drop to primitives when you need to own the render layers while keeping Memoir Tree's layout, measuring, and panning behavior:

```tsx
import { TreeCanvas, TreeEdges, TreeNodeLayer, TreeProvider } from "@memoir/tree";

export function Page() {
  return (
    <TreeProvider type="family" subject="henry" people={profiles} relationships={relationships}>
      <TreeCanvas>
        <TreeEdges />
        <TreeNodeLayer card={ProfileCard} />
      </TreeCanvas>
    </TreeProvider>
  );
}
```

`useTreeLayout()` exposes the computed cards, edges, bounds, and tree type for fully custom renderers.

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

For the intended Memoir surface, card, and edge styling, import the optional stylesheet. It uses CSS variables, stable data attributes, sharp corners, cream surfaces, black outlines, black shadows, and the Memoir orange accent:

```tsx
import "@memoir/tree/styles.css";
```

The helpers produce plain relationship rows. The library computes labels and placement from those facts relative to the current root profile.

## Styling

`FamilyTree` accepts styling controls for the surface, cards, and edges:

```tsx
<FamilyTree
  rootProfileId="henry"
  profiles={profiles}
  relationships={relationships}
  theme={{
    surfaceBackground: "#fffdf4",
    canvasBackground: "#f4efdc",
    cardBackground: "#fffdf4",
    cardBorder: "#030201",
    cardRadius: 0,
    cardShadow: "6px 6px 0 #030201",
    edge: "#3b342e",
    edgeWidth: 2,
    accent: "#ec5a44",
  }}
  spacing={{ row: 140, column: 44, padding: 40 }}
  lineShape="curved"
/>
```

Use `theme="memoir"` for the default Memoir preset or `theme="system"` for neutral system colors. A theme object can pass app-owned colors, outline width, edge width, card/profile corner radius, shadows, and font family. `lineShape="orthogonal"` keeps 90-degree connector turns; `lineShape="curved"` uses curved connectors. The same theme presets and helpers are exported as `memoirTreeTheme`, `systemTreeTheme`, `treeStylePresets`, `resolveTreeTheme`, and `createTreeThemeStyle`.

The card receives normal HTML props and stable data attributes:

```css
[data-family-card] {
  min-width: 128px;
  padding: 10px 12px;
  border: 2px solid currentColor;
  border-radius: 0;
  background: #fffdf4;
  box-shadow: 6px 6px 0 #030201;
}

[data-family-card][data-relation="self"] {
  background: #ec5a44;
}

[data-family-edge] {
  color: #3b342e;
}
```

## Public Surface

The public API is intentionally small:

- `FamilyTree`
- `DefaultFamilyCard`
- `TreeSurface`
- `TreeProvider`
- `TreeCanvas`
- `TreeEdges`
- `TreeNodeLayer`
- `useTreeLayout`
- `rel`
- `FamilyCardProps`
- `FamilyTreeProps`
- family relationship types
- `createFamilyIndex`
- `collectFamilyNeighborhood`
- `buildFamilyTreeLayout`

## Local Development

```bash
bun run ci
bun run typecheck
bun test
bun run build
bun run site
```

`bun run site` starts the local Next.js/Fumadocs site in `site/`.

## CI and Deploy

```bash
bun run ci
bun run ci:package
bun run ci:site
bun run deploy:package
bun run deploy:site
bun run deploy:site:prod
```

`deploy:package` publishes the npm package. `deploy:site` creates a Vercel preview deployment for the docs site, and `deploy:site:prod` deploys that site to production.

## License

MIT
