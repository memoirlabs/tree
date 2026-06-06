# Memoir Tree v0.4.4

Patch release for reliable tree drag-panning from canvas and card surfaces.

## Changes

- Allow touch and pen drag starts without relying on mouse-only `button` values.
- Keep `pan-page-scroll` vertical touch gestures available for page scroll while horizontal touch drags pan the tree.
- Apply touch-action behavior through the canvas/card wrapper layers.
- Show `grabbing` while a drag is active.

## Verify

- `bun run typecheck`
- `bun test`
- `bun run build`
