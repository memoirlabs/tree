# Agent Guide

This repository is `@memoir/tree`: a lightweight React + TypeScript package for relationship-aware tree renderers.

## Product Direction

- Keep the package focused on scoped tree renderers: `FamilyTree` and `OrgChart`. Do not turn it into a generic graph editor, treeview library, or React Flow competitor.
- The differentiators are domain-specific models on top of a shared tree core:
  - Family trees: parentage, partnership, guardianship, subject-relative labels, measured cards, relationship edges, and a readable family neighborhood.
  - Org charts: people, manager/report relationships, rooted hierarchy layout, measured cards, and reporting edges.
- Keep it lightweight and hackable. Do not add UI frameworks, CSS frameworks, Radix, shadcn, Tailwind, CVA, CSS-in-JS, animation libraries, or graph engines.
- React stays a peer dependency. The package should not bundle React.
- Use Bun for local commands and scripts.

## Design Contract

- The intended skin is the tiny package stylesheet: `import "@memoir/tree/styles.css";`.
- The stylesheet is framework-free CSS using CSS variables and stable data attributes.
- The default visual language is Memoir: cream canvas, white cards, sharp corners, black outlines/shadows, and root-node focus styling.
- Design should stay hackable through:
  - CSS variables
  - stable data attributes
  - `theme`
  - `className`
  - `cardClassName`
  - `edgeClassName`
  - fully custom React cards
- Do not auto-import CSS from JS. Consumers import the stylesheet explicitly.
- Do not add global resets, font imports, or broad selectors to `src/styles.css`.

## API Direction

Prefer the clean names in new family docs and examples:

- `people`
- `subject`
- `card`
- `onPersonClick`

The old Memoir-shaped aliases (`profiles`, `rootProfileId`, `renderProfileCard`, and `onSelectProfile`) were removed in the breaking API cleanup. Do not reintroduce them unless there is an explicit migration plan.

For org charts, prefer:

- `people`
- `root`
- `relationships`
- `card`
- `onPersonClick`

## Current API

Main exports include:

- `FamilyTree`
- `OrgChart`
- `DefaultFamilyCard`
- `DefaultOrgCard`
- `TreeProvider`
- `TreeCanvas`
- `TreeEdges`
- `TreeNodeLayer`
- `TreeSurface`
- `useTreeLayout`
- `rel`
- `org`
- `buildFamilyTreeLayout`
- `buildOrgChartLayout`
- `createFamilyIndex`
- `collectFamilyNeighborhood`
- `defaultFamilyNeighborhoodLimits`

Important types include:

- `FamilyTreeProps`
- `FamilyCardProps`
- `OrgChartProps`
- `OrgCardProps`
- `FamilyTreeCardProps`
- `FamilyNeighborhoodLimits`
- `TreeViewport`
- `TreeApi`
- family relationship types
- org reporting relationship types
- layout types

## Custom Cards

Custom cards are central to the library. Preserve this flow:

- `FamilyTree` and `OrgChart` provide layout, measurement, ARIA props, data attributes, domain metadata, selected/focused/collapsed state, and handlers.
- User cards render app-owned markup.
- User cards should spread `...props` on the card root.
- `cardProps` exists so users can pass app-owned typed props into cards without wrappers.

Do not make the default card or card API over-opinionated.

## Accessibility

Accessibility should be built into the API layer:

- Preserve `ariaLabel` for the tree surface.
- Preserve `getPersonLabel` for readable card labels.
- Preserve keyboard activation for clickable cards.
- Preserve `aria-selected`, `data-selected`, and `data-focused`.
- Be careful with native `<button>` wrappers because custom cards may contain nested buttons. Prefer passing accessible props to the card root unless a larger API redesign is explicitly requested.

## Viewport

The viewport API should remain small:

- `viewport`
- `initialViewport`
- `defaultViewport`
- `onViewportChange`
- `treeApiRef`

`TreeApi` intentionally exposes only:

- `centerPerson(personId)`
- `fitToSubject()`
- `resetViewport()`

Do not expand into generic graph controls unless explicitly requested.

## Neighborhood Limits

Family neighborhood caps must be explicit and configurable through `limits`.

- Defaults live in `defaultFamilyNeighborhoodLimits`.
- `null` disables a cap for a group.
- Do not silently add new hard-coded caps.

## Source Layout

Shared code must live above the domain implementations:

- `src/tree/core`: shared surface, viewport, measurement, edge helpers, theme names, and generic tree types.
- `src/tree/family`: family-only relationships, indexing, layout, primitives, and `FamilyTree`.
- `src/tree/org-chart`: org-chart-only reporting facts, indexing, layout, and `OrgChart`.

Do not place shared tree code inside `src/tree/family` or `src/tree/org-chart`.

## Verification

Use Bun:

```bash
bun run typecheck
bun test
bun run build
bun run lint
```

Run docs/site checks when changing site code:

```bash
bun run --cwd site ci
```

## Editing Rules

- Keep public docs aligned: `README.md`, `site/content/docs/*.mdx`, and this file should not contradict each other.
- Avoid unrelated refactors and UI redesigns.
- Do not commit secrets or `.env` files.
- Respect existing working-tree changes from the user.
