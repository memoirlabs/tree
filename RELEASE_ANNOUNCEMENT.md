# Memoir Tree v0.4.1

`@memoir/tree@0.4.1` publishes the current 0.4 line: graph mode for real family-tree data, viewport polish, relationship-aware edge routing, and an isolated visual-check harness for release verification.

The main 0.4 addition is graph mode: a family model that can represent explicit partnerships, per-parent lineage, guardianship, multiple unions, and the local neighborhood around a subject without turning the package into a generic graph editor.

The package is still intentionally small. Apps own persistence, permissions, editing flows, profile drawers, routes, validation, and card markup. Tree owns the measured layout, relationship-aware edges, accessible card props, viewport behavior, and the default Memoir skin.

## What Changed

### Family Graph Mode

`FamilyTree` now accepts a `graph` prop as the recommended production API for family trees:

- `people` keeps app-owned person records by ID.
- `subject` anchors the rendered family neighborhood.
- `partnershipGroups` models spouse, partner, and co-parent groups.
- `parentChildLinks` models each parent-to-child link separately.
- `guardianshipLinks` models guardian and foster guardian relationships without pretending they are parentage.

This lets the renderer keep important relationship facts distinct. A child can have different lineage to each adult in a union. Multiple unions stay separate. Biological, adoptive, step, foster, and unknown links do not collapse into one generic parent edge. Guardianship can be shown as guardianship.

### Simple Mode Still Works

The existing `people`, `subject`, and `relationships` API is preserved for examples, prototypes, and straightforward trees. The `rel` helpers still create simple parentage, partnership, and guardianship rows.

For production family apps, graph mode is the better long-term shape because it maps more directly to real data and avoids losing lineage detail.

### Placement Metadata For Custom Cards

Custom family cards now receive placement metadata when graph mode is used:

- `partnershipGroupIds`
- `parentChildLinkIds`
- `guardianshipLinkIds`
- `visibleRelationshipIds`

This keeps the central custom-card flow intact. Tree provides layout, relationship metadata, ARIA/data props, selected/focused/collapsed state, and handlers. App cards still render app-owned markup and can receive typed `cardProps`.

### Relationship-Aware Layout And Edges

The 0.4 layout keeps sibling and child branches on shared top buses, keeps spouse and ex-spouse connectors horizontal, and renders separated/divorced relationship markers as distinct SVG paths. Divorced partnerships render two slash markers.

The graph layout also handles multiple partners around the subject, blended families, guardian links, adopted children, half-siblings, collapse behavior, and separate biological/step lineage per parent.

### Viewport Polish

`initialViewport="subject"` centers the subject after cards are measured, and the small `TreeApi` remains focused on:

- `centerPerson(personId)`
- `fitToSubject()`
- `resetViewport()`

The viewport code also handles string initial viewport modes correctly in browser runtime paths, so supported values such as `initialViewport="subject"` do not trip over object-only checks.

### Visual Verification Harness

Before publishing, the family tree was checked in an isolated browser harness, separate from the docs site. The harness renders a focused family scenario with parents, siblings, a spouse, an ex-spouse, and children. The visual pass confirmed:

- spouse and ex-spouse lines come out horizontally from card sides
- sibling and child lines drop into the top of cards
- divorced relationships show exactly two slashes
- the subject starts centered in a scrollable viewport
- cards do not overlap
- connectors do not cross through unrelated cards

## Migration Notes

Simple mode still works:

```tsx
<FamilyTree people={people} subject="alex" relationships={relationships} />
```

For real family data, prefer graph mode:

```tsx
<FamilyTree graph={graph} />
```

Use `partnershipGroups` for spouse, partner, and co-parent clusters. Use `parentChildLinks` for each individual parent-to-child lineage. Use `guardianshipLinks` for guardian and foster guardian relationships.

Keep persistence IDs, permissions, invites, editing state, routing, and validation in your app. `@memoir/tree` renders the family neighborhood you pass in.

## Verification

The release was checked with:

```bash
bun run typecheck
bun test
bun run build
bun run lint
bun run --cwd site ci
bun run npm:pack
```

Package audit passed for `@memoir/tree@0.4.1`.
