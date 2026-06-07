# Memoir Tree v0.4.8

Anchored routing and layout verification patch.

## Changes

- Route non-adjacent two-parent child groups through clear card anchors instead of drawing row bars through intervening cards.
- Keep child-bearing partners closest to the subject in crowded multi-partner rows.
- Add geometric invariant tests for card overlap, bounds containment, edge bounds, and edge/card crossings.
- Add a `/visual-check` docs route for repeatable browser stress testing.
- Fix `buildFamilyTreeLayout` input types so graph mode does not require redundant `subject` and `people`.

## Verify

- `bun run typecheck`
- `bun test`
- `bun run build`
- `bun run lint`
- `bun run --cwd site ci`
- Browser screenshot and drag metrics on `/visual-check`
