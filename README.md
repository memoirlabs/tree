<h1 align="center">Memoir Tree</h1>

<p align="center">
  Ergonomic React family trees and org charts.
</p>

[![npm](https://img.shields.io/npm/v/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)
[![npm downloads](https://img.shields.io/npm/dw/%40memoir%2Ftree)](https://www.npmjs.com/package/@memoir/tree)

`@memoir/tree` is a focused React library for rendering family trees and org charts. Give it your app-owned records and one normal card component. It handles measured layout, SVG edges, pan, zoom, card placement, and a tiny CSS-variable skin you can override.

## Why

Most tree UIs force your app into a specific data model or a fixed card design. Memoir Tree stays small: your app owns the data, permissions, mutations, and card markup; the library handles layout, measurement, connectors, and viewport behavior.

<p align="center">
  <img src="https://raw.githubusercontent.com/memoirlabs/tree/main/public/logo.png" alt="Memoir Labs Tree" width="720" />
</p>

## Features

- Bring your own profile shape.
- Describe family facts with `rel.parents`, `rel.children`, `rel.partner`, and `rel.guardians`.
- Describe org reporting facts with `org.reports`.
- Start with the built-in `DefaultFamilyCard`, then swap in any React card component and pass your own typed card props.
- Get computed labels like `self`, `parent`, `sibling`, `half-sibling`, `partner`, `grandparent`, and `grandchild`.
- Compose lower-level primitives when the default wrapper is not enough.
- Design with the tiny CSS file, stable data attributes, CSS variables, or the `theme` prop.
- Control or imperatively move the viewport with `viewport`, `defaultViewport`, `onViewportChange`, and `treeApiRef`.
- Make neighborhood limits explicit when large families need more than the default visible relatives.
- Use pure indexing and layout helpers in tests, previews, or custom renderers.

## Install

```bash
bun add @memoir/tree
```

## Usage

Import the stylesheet once for the intended Memoir skin. It is small, framework-free CSS: cream canvas, white cards, sharp corners, black outlines/shadows, and root-node focus styling.

```tsx
import { FamilyTree, rel } from "@memoir/tree";
import type { FamilyCardProps } from "@memoir/tree";
import "@memoir/tree/styles.css";

type Profile = {
  id: string;
  permissions?: {
    canEdit: boolean;
  };
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
  ...props
}: FamilyCardProps<Profile>) {
  return (
    <article {...props} className="memoir-profile-card">
      <strong>{person.profile.display}</strong>
      <small>{relation.label === "self" ? "root node" : relation.label}</small>
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

export function Page() {
  return <OrgChart people={people} root="ceo" relationships={relationships} />;
}
```

For a quick first render, omit `renderProfileCard`. The built-in default card displays `name`, `label`, `profile.display`, or the profile ID:

```tsx
<FamilyTree profiles={profiles} rootProfileId="henry" relationships={relationships} />
```

For a configurable card without custom boilerplate, use `StyledFamilyCard` with `cardProps`:

```tsx
import { FamilyTree, StyledFamilyCard } from "@memoir/tree";

<FamilyTree
  card={StyledFamilyCard}
  cardProps={{
    radius: "round",
    outlined: true,
    shadow: "flat",
    avatar: "round",
  }}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

The clean API names are `people` and `subject`:

```tsx
<FamilyTree people={profiles} subject="henry" relationships={relationships} />
```

`profiles` and `rootProfileId` remain supported Memoir-shaped aliases for app compatibility.

`FamilyTree` owns its viewport defaults. It fills the parent width, inherits parent height when available, falls back to a usable minimum height, clips overflow, and supports drag-panning and zooming without requiring wrapper CSS. Use `style`, `className`, `zoom`, or `interactionMode="scroll"` when a host app wants a different container contract.

## Custom Cards

Most apps should bring their own card. Memoir Tree passes normal HTML props, accessibility props, stable data attributes, relation metadata, root focus state, optional app-owned selection state, and your original person record into the card. Spread `...props` onto your root element so keyboard handlers, data attributes, and styling hooks keep working:

```tsx
function ProfileCard({
  focused,
  person,
  relation,
  ...props
}: FamilyCardProps<Profile>) {
  return (
    <article {...props} className="profile-card">
      <img alt="" src={person.profile.avatar} />
      <strong>{person.profile.display}</strong>
      <small>{focused && relation.label === "self" ? "root node" : relation.label}</small>
    </article>
  );
}

<FamilyTree
  card={ProfileCard}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

If your card needs app-owned props, pass them through `cardProps`. Use an object for the same props on every card, or a function when props depend on the person or computed tree props:

```tsx
type ProfileCardExtraProps = {
  canEdit: boolean;
  density: "compact" | "comfortable";
  onOpenProfile: (profileId: string) => void;
};

function ProfileCard({
  canEdit,
  density,
  onOpenProfile,
  person,
  personId,
  relation,
  ...props
}: FamilyCardProps<Profile> & ProfileCardExtraProps) {
  return (
    <article {...props} data-density={density}>
      <strong>{person.profile.display}</strong>
      <small>{relation.label}</small>
      {canEdit ? (
        <button type="button" onClick={() => onOpenProfile(personId)}>
          Edit
        </button>
      ) : null}
    </article>
  );
}

<FamilyTree
  card={ProfileCard}
  cardProps={(profile) => ({
    canEdit: Boolean(profile.permissions?.canEdit),
    density: "compact",
    onOpenProfile,
  })}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

Use `renderProfileCard` when you prefer a render function or need to close over app state directly.

## Accessibility

`FamilyTree` labels the viewport as a region and passes selection, focus, keyboard, and ARIA props into each card. If cards are clickable through `onPersonClick` or `onSelectProfile`, Memoir Tree adds `role="button"`, `tabIndex={0}`, and Enter/Space activation props. Always spread `...props` onto your card root so those props are preserved.

Use `ariaLabel` to name the tree surface and `getPersonLabel` to generate readable labels for each card:

```tsx
<FamilyTree
  ariaLabel="Henry's family tree"
  getPersonLabel={(profile) => profile.profile.display}
  onPersonClick={(profile) => openProfile(profile.id)}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

If your custom card contains nested interactive controls, keep spreading the props on the outer card and stop propagation in inner controls only when your app needs that behavior.

## Viewport

The tree has a small viewport API instead of becoming a generic graph editor. Use `viewport` when your app owns pan and zoom state, or `defaultViewport` for an initial uncontrolled position:

```tsx
const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

<FamilyTree
  viewport={viewport}
  onViewportChange={setViewport}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

For buttons like "center Henry" or "reset view", pass a React ref to `treeApiRef`:

```tsx
import { useRef } from "react";
import type { TreeApi } from "@memoir/tree";

const treeApiRef = useRef<TreeApi | null>(null);

<button type="button" onClick={() => treeApiRef.current?.fitToSubject()}>
  Center subject
</button>

<FamilyTree
  treeApiRef={treeApiRef}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

The imperative API stays intentionally tiny:

- `centerPerson(personId)` scrolls a person into the center of the viewport.
- `fitToSubject()` centers the current subject.
- `resetViewport()` returns to `defaultViewport` / `defaultZoom`.
- `zoomTo(zoom)` sets the current zoom.

## Neighborhood Limits

Memoir Tree is family-specific and renders a subject-centered neighborhood. To avoid accidentally huge canvases, it has visible-relative defaults. Make those limits explicit when your app needs a different shape:

```tsx
<FamilyTree
  limits={{
    siblings: 12,
    children: null,
    grandchildren: 16,
  }}
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

Use `null` to disable a cap for that group. The default limits are exported as `defaultFamilyNeighborhoodLimits`.

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

For the intended Memoir surface, card, and edge styling, import the stylesheet. It uses CSS variables, stable data attributes, sharp corners, cream surfaces, black outlines, black shadows, and the Memoir orange accent:

```tsx
import "@memoir/tree/styles.css";
```

The helpers produce plain relationship rows. The library computes labels and placement from those facts relative to the current root profile.

## Design

The default stylesheet is intentionally hackable. Override CSS variables for broad theme changes, target stable data attributes for custom rules, or replace the card entirely.

### Theme Prop

Use the `theme` prop only to pick a built-in preset:

```tsx
<FamilyTree
  rootProfileId="henry"
  profiles={profiles}
  relationships={relationships}
  theme="system"
  spacing={{ row: 140, column: 44, padding: 40 }}
  lineShape="curved"
/>
```

Use `theme="memoir"` for the default Memoir preset or `theme="system"` for neutral system colors. For colors, outlines, radii, shadows, and fonts, set CSS variables with `className` or `style`. `lineShape="orthogonal"` keeps 90-degree connector turns; `lineShape="curved"` uses curved connectors.

### CSS Variables

Override variables on the tree root with `className`:

```tsx
<FamilyTree
  className="my-family-tree"
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

```css
.my-family-tree {
  --tree-canvas-bg: #fff7df;
  --tree-card-bg: #ffffff;
  --tree-card-border: #17120f;
  --tree-card-radius: 0;
  --tree-card-shadow: 5px 5px 0 #17120f;
  --tree-edge: #17120f;
  --tree-edge-width: 2;
}
```

### Data Attributes

Cards and edges receive stable attributes for precise styling:

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

Useful selectors include:

- `[data-tree-surface]` for the viewport.
- `[data-tree-canvas]` for the scaled canvas.
- `[data-family-card]` / `[data-tree-card]` for cards.
- `[data-family-edge]` / `[data-tree-edge]` for SVG connectors.
- `[data-person-id]` for a specific person.
- `[data-relation]`, `[data-generation]`, and `[data-side]` for relation-aware styling.

### Card and Edge Classes

Use `cardClassName` and `edgeClassName` when your app prefers class selectors:

```tsx
<FamilyTree
  cardClassName="profile-card"
  edgeClassName="family-edge"
  profiles={profiles}
  relationships={relationships}
  rootProfileId="henry"
/>
```

## API

The API is intentionally small:

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
- `TreeViewport`
- `TreeApi`
- family relationship types
- `defaultFamilyNeighborhoodLimits`
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

CI never publishes releases automatically. `deploy:package` publishes only the npm package. `deploy:site` creates a Vercel preview deployment for the docs site, and `deploy:site:prod` deploys that site to production.

## Releases

```bash
bun run release:dry-run
bun run release
bun run release -- --message "Short announcement intro."
bun run release -- --base v0.2.0
bun run release:announcement
```

Releases are manual by design. `bun run release` checks the package, writes `RELEASE_ANNOUNCEMENT.md`, publishes to npm, creates the `vX.Y.Z` git tag, pushes the tag, and creates a GitHub Release with the announcement as the release notes.

Release announcement settings live in `release.config.json`. The announcement uses the latest git tag as the default base and lists every commit through `HEAD` with commit links, authors, and dates. Use `release:dry-run` before publishing to verify the package and announcement without creating npm, git, or GitHub release artifacts.

## License

MIT
