# Memoir Tree v0.4.2

Patch release for family-tree viewport and edge rendering.

## Changes

- Add `interactionMode="pan-page-scroll"` for drag-panning trees while vertical touch gestures scroll the page.
- Recompute family layout bounds from final shifted card positions so right-side cards and edges are not clipped.
- Route single-child descendant edges below parent cards, including right-shifted children.
- Draw adjacent visible bars for multi-partner partnership groups.
- Update README, docs, and `llms.txt` for the new interaction mode.

## Verify

- `bun run typecheck`
- `bun test`
- `bun run build`
