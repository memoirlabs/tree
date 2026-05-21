# Agent Guide

This repository is `@memoir/tree`: a lightweight React + TypeScript package for subject-centered family trees.

## Product Direction

- Keep the package family-specific. Do not turn it into a generic graph editor, org chart framework, treeview library, or React Flow competitor.
- The differentiator is the family relationship model: parentage, partnership, guardianship, subject-relative labels, measured cards, relationship edges, and a readable family neighborhood.
- Keep it lightweight and hackable. Do not add UI frameworks, CSS frameworks, Radix, shadcn, Tailwind, CVA, CSS-in-JS, animation libraries, or graph engines.
- React stays a peer dependency. The package should not bundle React.
- Use Bun for local commands and scripts.

## Design Contract

- The intended skin is the tiny package stylesheet: `import "@memoir/tree/styles.css";`.
- The stylesheet is framework-free CSS using CSS variables and stable data attributes.
- The default visual language is Memoir: cream canvas, white cards, sharp corners, black outlines/shadows, and orange selected state.
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

Prefer the clean names in new docs and examples:

- `people`
- `subject`
- `card`
- `onPersonClick`

The Memoir-shaped aliases remain supported for app compatibility:

- `profiles`
- `rootProfileId`
- `renderProfileCard`
- `onSelectProfile`

Do not remove aliases without an explicit migration plan.

## Current API

Main exports include:

- `FamilyTree`
- `DefaultFamilyCard`
- `TreeProvider`
- `TreeCanvas`
- `TreeEdges`
- `TreeNodeLayer`
- `TreeSurface`
- `useTreeLayout`
- `rel`
- `buildFamilyTreeLayout`
- `createFamilyIndex`
- `collectFamilyNeighborhood`
- `defaultFamilyNeighborhoodLimits`

Important types include:

- `FamilyTreeProps`
- `FamilyCardProps`
- `FamilyTreeCardProps`
- `FamilyNeighborhoodLimits`
- `TreeViewport`
- `TreeApi`
- family relationship types
- layout types

## Custom Cards

Custom cards are central to the library. Preserve this flow:

- `FamilyTree` provides layout, measurement, ARIA props, data attributes, relationship metadata, selected/focused/collapsed state, and handlers.
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
- `defaultViewport`
- `onViewportChange`
- `zoom`
- `defaultZoom`
- `onZoomChange`
- `treeApiRef`

`TreeApi` intentionally exposes only:

- `centerPerson(personId)`
- `fitToSubject()`
- `resetViewport()`
- `zoomTo(zoom)`

Do not expand into generic graph controls unless explicitly requested.

## Neighborhood Limits

Family neighborhood caps must be explicit and configurable through `limits`.

- Defaults live in `defaultFamilyNeighborhoodLimits`.
- `null` disables a cap for a group.
- Do not silently add new hard-coded caps.

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
