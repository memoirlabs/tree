# Building `@memoir/tree` for Memoir.ag

Memoir is not trying to be another place where families dump files. The product is built around a more specific idea: memories only become durable when they stay attached to people. A handwritten recipe matters because it belonged to a grandmother. A photo matters because of who is in it, where they were, and how they connect to everyone else. A story from Thanksgiving matters because it is not just an entry in a feed. It is part of a family map.

That is why `@memoir/tree` exists.

We needed a way to show family context inside Memoir without turning the app into genealogy software, without forcing our product data into somebody else's graph editor, and without shipping a heavy visualization dependency for a renderer that should feel simple, fast, and owned by the app. The package became a small React library for rendering relationship-aware family trees and org charts from plain TypeScript data. It handles the hard rendering work: relationship indexing, subject-centered layout, measured cards, connector routing, panning, accessibility props, stable styling hooks, and package distribution. Memoir keeps the product work: profiles, permissions, memories, recipes, photos, editing, invitations, privacy, and the card UI.

The simplest version of the philosophy is this: `@memoir/tree` draws the relationship surface, but the app owns the people.

That separation mattered from the beginning. Memoir.ag is a family memory app, not a public ancestry database and not a social network. Families can build profiles for themselves, for children, for offline relatives, and for people who have passed away. They can add photos, recipes, and stories in one private place. The tree needed to support that product reality. A person might have no account. A profile might represent someone living, deceased, invited, managed by a family member, or still just a placeholder. A renderer that assumes every node is a user, every edge is biological, or every card looks the same would make the app fight its own model.

So we built the tree as an app-owned renderer: pass a `people` record, pass flat relationship facts, choose a `subject` or `root`, optionally bring your own card, and let the package create the visual neighborhood.

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

That API looks small because most of the complexity is underneath it.

## Why We Built It

We first tried the obvious route: treat the family tree as a product component. That is how the repository began in February 2026. The initial commit was a set of local React components: a family tree, node cards, an add-member dialog, design presets, types, and some utility code. It was useful, but it mixed too many concerns. Product editing UI, layout, card rendering, relationship data, and packaging concerns all lived too close together.

That works for a prototype. It does not work for a product surface that will show up across Memoir.

A family tree in Memoir has to do several jobs at once:

- It has to explain who someone is relative to the current profile.
- It has to make nearby relationships readable without rendering an infinite ancestry graph.
- It has to let the app render rich profile cards with product-specific actions.
- It has to support non-biological relationships like guardians, partners, former partners, and coparents.
- It has to be fast enough to use inside normal product pages.
- It has to be small enough that consumers do not inherit a graph engine.
- It has to look like Memoir by default, while still being easy to restyle.

Existing graph libraries are powerful, but that power was not the requirement. We did not need drag-to-create graph editing, canvas-level graph simulation, minimaps, node handles, physics, or a new state model. We needed a relationship-aware tree renderer with a small API and predictable output. In Memoir terms, we needed to show a family neighborhood: the subject, their parents and guardians, siblings and half-siblings, partners and coparents, children, grandchildren, and grandparents.

That is a domain problem before it is a rendering problem. The library's center of gravity became the relationship model.

## Commit Archaeology

The commit history shows the library becoming more focused over time.

The first phase was local product code. The initial commit added React components, design presets, a `FamilyTree`, node cards, and a TypeScript setup. Shortly after, the project picked up Bun lockfiles, package metadata, Deno and JSR publishing files, and early dependency updates. At that point, the code was still closer to "a component extracted from an app" than "a clean package."

The second phase was customization. The commit titled `Support custom node rendering & relation options` was important because it moved the tree away from fixed UI. Custom rendering is the difference between a demo component and a product library. Memoir's profile cards need room for product-specific details, privacy state, actions, photos, and future features. A tree package should not own that markup. It should provide props, layout, metadata, accessibility attributes, and event handlers, then get out of the way.

The third phase was packaging and identity. The project rebranded to `@memoir`, adjusted the build, and eventually migrated publishing to npm. Deno and JSR were useful experiments, but npm is where React application teams expect to install a package like this. By the current package shape, `@memoir/tree` publishes `dist`, exposes `./styles.css`, keeps React as a peer dependency, and ships TypeScript declarations through `tsc`.

The fourth phase was documentation and productization. Several May commits added the docs site, reorganized source files, revamped README content, added a logo, created development docs, and introduced release tooling. This was not cosmetic work. A small library lives or dies by whether a developer can understand its boundaries. The docs repeatedly say what the package is not: not a database, not a graph editor, not a form system, not the owner of your profile UI.

The fifth phase was architecture. The source moved into domain folders:

```text
src/tree/core
src/tree/family
src/tree/org-chart
```

That split is the package in miniature. Core owns the generic rendering surface: panning, card measurement, absolute positioning, SVG edge rendering, coordinate helpers, styling presets, and shared types. Family owns parentage, guardianship, partnership, computed relationship labels, family neighborhood collection, family layout, and family-specific edges. Org chart owns manager/report indexing, subtree layout, and reporting edges. Shared rendering lives above the domains; domain rules do not leak into the generic surface.

The sixth phase was scope correction. One commit removed org chart and a DSL to bring the project back to family-tree scope. Then the later architecture brought org chart back as a bounded sibling domain, not as a generic graph ambition. That distinction matters. The project can support `FamilyTree` and `OrgChart` because both are scoped, hierarchical relationship renderers. It still should not become a React Flow competitor.

The final May cleanup made the API match how the product talks. The package moved to clean public names: `people`, `subject`, `card`, `onPersonClick` for family trees, and `people`, `root`, `relationships`, `card`, `onPersonClick` for org charts. Older Memoir-shaped names like `profiles`, `rootProfileId`, `renderProfileCard`, and `onSelectProfile` were removed. That was a breaking cleanup, but the right one. A public package should use simple names and teach its model clearly.

By the generated v0.3.1 announcement, the repository had 31 commits in the release range. That history is unusually compressed, but the arc is clear: prototype, extract, package, document, split core from domains, tighten the API, and automate the release path.

## The Data Model

The package starts with plain objects.

`people` is a record keyed by person id. The library does not require a database shape. Your person can be `{ id, name }`, or it can include avatars, roles, profile metadata, privacy state, product flags, and anything else the app needs. The tree only needs stable ids and a way to label a person. If you do not provide `getPersonLabel`, the defaults look for common fields like `name`, `label`, or `profile.display`.

Relationships are flat facts. For family trees, the helpers are intentionally small:

```ts
rel.parents("alex", ["morgan", "casey"]);
rel.partner("alex", "jordan", { relation: "spouse" });
rel.children(["alex", "jordan"], ["riley"]);
rel.guardians("alex", ["taylor"]);
```

The library turns those facts into indexes:

- `parentageByChild`
- `parentageByParent`
- `guardianshipByChild`
- `guardianshipByGuardian`
- `partnershipsByPerson`

Those maps are the first performance decision. Relationship lookup should not mean scanning the full relationship array every time the layout asks "who are this person's parents?" or "which children does this guardian care for?" The index makes traversal direct and keeps the later layout code simple.

The index also enforces an invariant: parentage cannot contain cycles. If a parentage cycle is found, `createFamilyIndex` throws a clear error. That is not a defensive nicety. A tree layout depends on ancestry having direction. Rendering a cycle as if it were a normal family branch would produce confusing output and likely unstable traversal.

Once indexed, the family collector builds a subject-centered neighborhood. The subject is labeled `self`. Parents and guardians become ancestor-side relatives. Siblings and half-siblings are computed by comparing parent sets. Partners come from explicit partnership facts, while coparents can be inferred from shared children. Children and grandchildren are computed from parentage and guardianship. Each relative carries a computed relation:

```ts
{
  label: "half-sibling",
  generation: 0,
  side: "sibling"
}
```

This is why the renderer can label a card as "parent", "guardian", "partner", "coparent", "child", "grandchild", or "root node" without asking the app to precompute those labels.

There are also explicit neighborhood limits:

```ts
export const defaultFamilyNeighborhoodLimits = {
  grandparents: 4,
  parents: 4,
  siblings: 8,
  halfSiblings: 8,
  partners: 3,
  children: 8,
  grandchildren: 8,
};
```

The defaults are product-minded. A family can be large, but a profile page needs to stay readable. The limits are configurable, and `null` disables a cap for a group. That keeps the package honest: it does not silently hide relatives behind an unchangeable hard limit, but it also does not pretend every family graph should render in full by default.

## Layout as a Product Decision

The family tree layout is not a general graph layout. It is a subject-centered family neighborhood layout.

The algorithm builds rows:

1. Grandparents
2. Parents and guardians
3. Siblings, half-siblings, self, partners, and coparents
4. Children
5. Grandchildren

Each row is compacted for uniqueness, sorted by relationship order and id, measured, and placed horizontally. The subject row is shifted so the subject is centered. Then the whole layout is offset into positive coordinates with padding. Finally, the package routes visible edges and returns cards, edges, and bounds.

That design optimizes for a specific reading experience. When someone opens a Memoir profile, the question is not "what is every possible node connected to this graph?" The question is "who is this person surrounded by?" The renderer should make that answer visible in one glance.

The org chart layout follows a different domain rule. It builds a rooted manager/report subtree. It groups reports by parent, computes row heights by depth, recursively computes subtree widths, places each manager centered above their reports, and routes reporting edges downward. The implementation is still small because org charts are also scoped: a root, a reporting relationship, optional collapsed nodes, optional max depth, and measured cards.

The key architecture choice is that both domains share rendering primitives but not domain logic. A family "partner" edge and an org "manager" edge are both SVG paths on a canvas, but the facts that create them are different. Keeping those layers separate makes the package easier to reason about.

## Measured Cards

The renderer does not assume every card has the same size.

That is essential for Memoir. A profile card may include a photo, a name, a relationship label, a short subtitle, a status badge, an invitation state, or an action button. Forcing every card into a fixed box would make the library easy to implement but hard to use in the app.

`useCardMeasurements` handles this by measuring rendered card wrappers. It queries elements marked with `data-tree-measure-id` or `data-family-measure-id`, reads their `getBoundingClientRect()`, rounds dimensions to two decimals, and stores a `Record<PersonId, TreeCardSize>`. It uses `ResizeObserver` for card size changes, `MutationObserver` for newly rendered measurement nodes, and a window resize listener. Measurement reads are scheduled through `requestAnimationFrame`, and state only updates when the new measurement record differs from the current one.

That last equality check matters. Layout changes can cause renders; renders can cause measurement; measurement can cause layout changes. Updating state only when dimensions actually changed avoids pointless render loops.

The layout has a fallback size of `220 x 80` so it can produce a first pass before real measurements arrive. Once real card sizes are known, the layout recomputes with actual dimensions. This gives consumers flexible cards without making them manually provide dimensions.

## Rendering Performance

The performance strategy is mostly about avoiding unnecessary machinery.

There is no canvas drawing engine, no physics simulation, no graph runtime, and no animation dependency. Cards are normal React elements absolutely positioned with CSS transforms. Edges are normal SVG paths. The tree surface is a scrollable/pannable DOM region. Styling is CSS variables and data attributes.

That means the browser can do what it is good at:

- Text, images, focus rings, buttons, and semantics stay in the DOM.
- Card movement uses `transform: translate(...)`, which avoids recalculating normal document flow for each card.
- Edges are SVG paths with a single `d` attribute per relationship.
- The tree surface uses CSS containment with `contain: layout paint`.
- The package does not ship a large runtime just to draw lines between cards.

The latest cleanup removed zoom support and switched the surface to panning-only behavior. That was a product and performance choice. Zoom sounds useful in a graph library, but it adds scale math, transform state, pointer edge cases, focus behavior problems, text readability concerns, and more API surface. For Memoir's use case, panning across a readable family neighborhood is better than zooming around an infinite graph. Removing zoom simplified the viewport API and kept the public `TreeApi` small:

```ts
centerPerson(personId);
fitToSubject();
resetViewport();
```

Internally, the panning surface stores scroll position as the viewport. When uncontrolled, it centers the rendered bounds after layout. When controlled, it applies the provided `viewport`. Pointer drag updates `scrollLeft` and `scrollTop`, but it deliberately ignores drags that begin inside `[data-tree-card]` so cards can remain interactive. The surface can also run in `scroll` or `none` interaction modes.

The rendering path is deliberately predictable:

1. Index relationships.
2. Collect the visible neighborhood or subtree.
3. Measure cards.
4. Build layout cards and edges.
5. Render positioned cards and SVG paths.
6. Let the app own interaction state.

That predictability makes performance easier to debug than a black-box graph engine.

## Edge Routing

Edges are domain-specific but rendered through a shared path helper.

The core helper creates either orthogonal paths or curved cubic Bezier paths:

```ts
M start.x start.y
L start.x midY
L end.x midY
L end.x end.y
```

or, for curved lines:

```ts
M start.x start.y
C start.x midY, end.x midY, end.x end.y
```

Coordinates are rounded to two decimals. That keeps generated paths stable and readable without pretending layout needs arbitrary floating-point precision.

Family edges add relationship meaning. Biological, adoptive, guardian, partner, former partner, and reporting edges can receive different data attributes or stroke styles. For example, family primitive edges set dashed strokes for adoptive, guardian, or former relationships. Consumers can style through `edgeClassName`, data attributes, and CSS variables.

Again, the point is not to cover every possible graph style. The point is to make the relationships Memoir actually shows clear.

## Custom Cards

Custom cards are the center of the public API.

The package provides `DefaultFamilyCard`, `StyledFamilyCard`, and `DefaultOrgCard`, but the expected product path is that apps bring their own card component. A custom family card receives:

- `person`
- `personId`
- `relation`
- `selected`
- `focused`
- `collapsed`
- `readOnly`
- `onAddRelationship`
- ARIA props
- stable `data-*` attributes
- event handlers
- `className`

The card should spread the provided props onto its root element:

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
```

This is how the package preserves accessibility and styling without owning markup. The root receives `aria-label`, `aria-selected`, keyboard activation, `role="button"` when clickable, `tabIndex`, selection/focus data attributes, generation data, side data, and person id data.

`cardProps` exists for app-owned typed props. That avoids wrapper components for common cases. A product can pass a tone, action label, permission flag, or display mode straight into the card while the tree still supplies layout and relationship metadata.

The library is careful not to wrap custom cards in native `<button>` elements. That would be convenient for accessibility, but product cards may contain buttons of their own. Instead, the package passes accessible props to the card root. This keeps interaction flexible and avoids invalid nested-button markup.

## Styling

The default skin is intentionally tiny.

Consumers import it explicitly:

```tsx
import "@memoir/tree/styles.css";
```

The package does not auto-import CSS from JavaScript. That is important for library behavior. Consumers should decide whether they want the default skin, where to load it, and how it participates in their own CSS pipeline.

The stylesheet is framework-free CSS with stable data attributes and CSS variables. The default Memoir visual language is cream canvas, white cards, sharp corners, black outlines, and flat shadows. But the customization surface stays simple:

```css
.my-tree {
  --tree-canvas-bg: #fff7df;
  --tree-card-bg: #ffffff;
  --tree-card-border: #17120f;
  --tree-card-shadow: 5px 5px 0 #17120f;
  --tree-edge: #17120f;
}
```

There is no Tailwind dependency in the package, no shadcn dependency, no Radix dependency, no CSS-in-JS runtime, no global reset, and no font import. That restraint is part of the design. A tree renderer should not bring an app-wide design system with it.

The docs site can use its own stack. The package should stay lightweight.

## Accessibility

Accessibility is handled at the API layer, not left as an afterthought.

The tree surface has an `ariaLabel`. Cards receive readable labels through `getPersonLabel` or sensible defaults. Clickable cards get keyboard activation for Enter and Space. Selection and focus state are reflected through `aria-selected`, `data-selected`, and `data-focused`. The SVG edge layer is marked `aria-hidden` because the meaningful relationship context is exposed through cards and labels.

The package does not try to solve every possible screen reader model for complex family graphs. It does make the default interactive surface and custom-card path accessible by construction, which is the right baseline for a reusable renderer.

## The Bun Stack

Bun is used throughout the repository because it keeps the package workflow fast and boring.

The root package scripts use Bun for the main loop:

```json
{
  "build": "rm -rf dist && tsc -p tsconfig.build.json && bun scripts/fix-dist-imports.ts",
  "check": "bun run lint && bun run typecheck && bun test && bun run build",
  "test": "bun test",
  "typecheck": "tsc --noEmit",
  "lint": "oxlint"
}
```

The package build is intentionally conservative. TypeScript emits JavaScript and declarations into `dist`, then a Bun script fixes relative ESM import specifiers and copies `src/styles.css` to `dist/styles.css`. As of May 2026, Bun's bundler is fast and useful, but TypeScript declaration generation is still best handled by `tsc` for a public library. The repository follows that reality instead of forcing all build steps through one tool.

Bun is still valuable everywhere else:

- `bun test` runs the test suite.
- Bun executes TypeScript release scripts directly.
- `Bun.file`, `Bun.write`, and `Bun.Glob` keep package scripts small.
- `Bun.spawn` powers release orchestration without another process library.
- `bun run --cwd site ci` keeps the docs site workflow aligned with the package.
- `bunx vercel deploy` handles site deployment commands.

The release script is a good example of the stack's style. It reads `package.json` with `Bun.file`, checks the git worktree, verifies tags, checks GitHub CLI availability, runs the full package check, generates the release announcement, optionally publishes to npm, tags the release, pushes the tag, and creates a GitHub Release. It is TypeScript, but it does not need a build step just to run.

The npm package is also shaped like a modern React library:

- `react` is a peer dependency, so consumers do not get a bundled second React.
- `exports` points to the built JS and declaration files.
- `./styles.css` is an explicit stylesheet export.
- `files` limits publishing to `dist`, `README.md`, and `LICENSE`.
- `sideEffects` marks CSS as side-effectful so bundlers do not erase the stylesheet import.
- The package is ESM.

The docs site is a separate Next.js/Fumadocs app using React 19, Next 16, Fumadocs, Shiki, Tailwind for the site, and oxlint. That stack is allowed to be heavier because it is not shipped as the library runtime. The package remains small and framework-free beyond React itself.

## Testing

The tests focus on the behavior that would be painful to discover visually.

The layout tests verify subject-centered family layout, visible relationship edges, custom spacing, curved routing, collapsed descendants, and duplicate guardian edge prevention. The indexing tests verify computed relationship labels, parent and guardian merging, sibling and half-sibling detection, partner and coparent collection, explicit neighborhood limits, and parentage cycle rejection.

The primitive tests render React markup to static HTML and check the public contract: custom cards receive props, ARIA labels appear, focused state is reflected, clickable cards get keyboard semantics, panning does not introduce scale transforms, `cardProps` passes app-owned typed props, and `StyledFamilyCard` can be configured without custom-card boilerplate.

That test shape matches the risk profile. The package is mostly deterministic TypeScript transformation plus React markup. The most important tests are not snapshot-heavy visual tests; they are contract tests around relationship computation, layout output, and rendered attributes.

## What We Chose Not to Build

The most important choices in `@memoir/tree` are the things it does not do.

It does not store family data. Memoir owns data persistence.

It does not manage permissions. Memoir owns privacy and sharing.

It does not provide editing flows. Memoir owns mutation UX.

It does not auto-import CSS. Consumers opt into styles.

It does not bundle React. React stays a peer dependency.

It does not ship a graph engine. The layout is deterministic and domain-specific.

It does not expose generic graph controls. The viewport API stays small.

It does not render the entire ancestry universe by default. It renders a readable family neighborhood.

Those constraints are why the library is useful. Without them, it would become broader and less valuable.

## Why It Fits Memoir

Memoir is about preserving family memories in context. The product has profiles, albums, recipes, photos, stories, invitations, and Mimi, the assistant that helps people save and organize what matters. The family tree is the connective tissue between those pieces. It lets someone understand where a memory belongs and who else it touches.

But the tree cannot be the product. It has to be a surface inside the product.

That is the real reason `@memoir/tree` exists as a package. The renderer has enough structure to understand family relationships, but not so much ownership that it competes with Memoir's app model. It is reusable inside Memoir, useful outside Memoir, and small enough to reason about.

The current library is the result of a lot of narrowing:

- From local app component to npm package.
- From fixed node UI to custom cards.
- From profile-shaped internal names to public `people` and `subject`.
- From mixed code to `core`, `family`, and `org-chart` domains.
- From zoomable graph surface to panning tree surface.
- From hand release notes to Bun-powered release automation.
- From "can draw a tree" to "can render a relationship-aware family neighborhood."

That narrowing is the product work. A good library is not the one with the most options. It is the one whose constraints match the problem.

For Memoir.ag, the problem is not drawing arbitrary graphs. The problem is helping families see the people behind their memories.

`@memoir/tree` is the small renderer we built for that.
